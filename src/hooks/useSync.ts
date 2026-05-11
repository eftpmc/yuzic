import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from '@backpackapp-io/react-native-toast'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import { QueryKeys } from '@/enums/queryKeys'
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import { selectLastSyncedAt } from '@/utils/redux/selectors/settingsSelectors'
import { setLastSyncedAt } from '@/utils/redux/slices/settingsSlice'
import {
  setLibraryAlbums,
  setLibraryArtists,
  setLibraryPlaylists,
  setLibraryTracks,
  setLibraryGenres,
  setLibraryStarred,
} from '@/utils/redux/slices/librarySlice'
import { useApi } from '@/api'
import { Album, Artist, Playlist, SongBase, Song } from '@/types'
import { DETAIL_STALE_MS, shouldRunDetailEnrichment } from './syncPolicy'

const SYNC_THROTTLE_MS = 30 * 60 * 1000
// Max concurrent N+1 requests to avoid overwhelming the server
const N1_CONCURRENCY = 15
const MAX_AUTO_DETAIL_ALBUMS = 500
const MAX_AUTO_DETAIL_PLAYLISTS = 100

async function fetchBatch<T>(
  ids: string[],
  fn: (id: string) => Promise<T>,
): Promise<T[]> {
  const results: T[] = []
  for (let i = 0; i < ids.length; i += N1_CONCURRENCY) {
    const settled = await Promise.allSettled(ids.slice(i, i + N1_CONCURRENCY).map(fn))
    for (const r of settled) {
      if (r.status === 'fulfilled') results.push(r.value)
    }
  }
  return results
}

export function useSync() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const api = useApi()
  const activeServer = useSelector(selectActiveServer)
  const lastSyncedAt = useSelector(selectLastSyncedAt)
  const lastSyncedAtRef = useRef(lastSyncedAt)
  const syncGenerationRef = useRef(0)
  const [isSyncing, setIsSyncing] = useState(false)

  const isConnected = !!activeServer?.id && !!activeServer?.isAuthenticated

  useEffect(() => {
    lastSyncedAtRef.current = lastSyncedAt
  }, [lastSyncedAt])

  const syncPlaylists = useCallback(async () => {
    if (!isConnected) return
    const serverId = activeServer!.id
    await queryClient.refetchQueries({ queryKey: [QueryKeys.Playlists, serverId] })

    const playlists = queryClient.getQueryData<Playlist[]>([QueryKeys.Playlists, serverId])
    if (playlists) {
      const fullPlaylists = await fetchBatch(
        playlists.map(p => p.id),
        id => queryClient.fetchQuery({
          queryKey: [QueryKeys.Playlist, serverId, id],
          queryFn: () => api.playlists.get(id),
          staleTime: 0,
        })
      )
      dispatch(setLibraryPlaylists(fullPlaylists))
    }
  }, [isConnected, activeServer, queryClient, dispatch, api])

  const sync = useCallback(async (force = false) => {
    if (!isConnected) return
    const now = Date.now()
    const lastSync = lastSyncedAtRef.current
    if (!force && lastSync !== null && now - lastSync < SYNC_THROTTLE_MS) return
    const shouldEnrichDetails = shouldRunDetailEnrichment({
      force,
      previousSyncAt: lastSync,
      now,
    })
    const serverId = activeServer!.id
    const generation = ++syncGenerationRef.current
    setIsSyncing(true)

    try {
      // Phase 1: fetch all lists in parallel
      await Promise.allSettled([
        queryClient.refetchQueries({ queryKey: [QueryKeys.Albums, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Artists, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Playlists, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Tracks, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Starred, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Genres, serverId] }),
      ])

      // Immediately dispatch list-level data so the UI is responsive
      const albums = queryClient.getQueryData<Album[]>([QueryKeys.Albums, serverId])
      const artists = queryClient.getQueryData<Artist[]>([QueryKeys.Artists, serverId])
      const playlists = queryClient.getQueryData<Playlist[]>([QueryKeys.Playlists, serverId])
      const tracks = queryClient.getQueryData<SongBase[]>([QueryKeys.Tracks, serverId])
      const genres = queryClient.getQueryData<string[]>([QueryKeys.Genres, serverId])
      const starred = queryClient.getQueryData<{ songs: Song[] }>([QueryKeys.Starred, serverId])
      const hasAnyLibraryData = !!(
        albums?.length ||
        artists?.length ||
        playlists?.length ||
        tracks?.length ||
        genres?.length ||
        starred?.songs?.length
      )

      if (albums) dispatch(setLibraryAlbums(albums))
      if (artists) dispatch(setLibraryArtists(artists))
      if (playlists) dispatch(setLibraryPlaylists(playlists))
      if (tracks) dispatch(setLibraryTracks(tracks))
      if (genres) dispatch(setLibraryGenres(genres))
      if (starred?.songs) dispatch(setLibraryStarred(starred.songs))

      if (hasAnyLibraryData) {
        const syncedAt = Date.now()
        lastSyncedAtRef.current = syncedAt
        dispatch(setLastSyncedAt(syncedAt))
      }
    } finally {
      setIsSyncing(false)
    }

    // Phase 2: background enrichment — fetch full detail (with songs) without blocking the UI.
    ;(async () => {
      if (!shouldEnrichDetails) return
      // Abort if a newer sync started (e.g. user switched servers mid-sync).
      if (syncGenerationRef.current !== generation) return

      try {
        const albums = queryClient.getQueryData<Album[]>([QueryKeys.Albums, serverId]) ?? []
        const playlists = queryClient.getQueryData<Playlist[]>([QueryKeys.Playlists, serverId]) ?? []
        const shouldFetchAlbumDetails = force || albums.length <= MAX_AUTO_DETAIL_ALBUMS
        const shouldFetchPlaylistDetails = force || playlists.length <= MAX_AUTO_DETAIL_PLAYLISTS

        if (shouldFetchAlbumDetails) {
          // Use bulk fetch when the adapter supports it (Jellyfin: 2 requests
          // instead of 2N), otherwise fall back to the N+1 batch pattern.
          const fullAlbums = api.albums.listWithSongs
            ? await api.albums.listWithSongs()
            : await fetchBatch(
                  albums.map(a => a.id),
                  id => queryClient.fetchQuery({
                    queryKey: [QueryKeys.Album, serverId, id],
                    queryFn: () => api.albums.get(id),
                    staleTime: DETAIL_STALE_MS,
                  })
                )

          if (fullAlbums.length > 0) {
            dispatch(setLibraryAlbums(fullAlbums))

            // Derive tracks from enriched album songs so tracks/downloaded
            // library filters are always populated after Phase 2.
            const allSongs: SongBase[] = []
            fullAlbums.forEach(album => album.songs.forEach(song => allSongs.push(song)))
            if (allSongs.length > 0) dispatch(setLibraryTracks(allSongs))
          }
        }

        if (syncGenerationRef.current !== generation) return

        if (shouldFetchPlaylistDetails) {
          const fullPlaylists = await fetchBatch(
            playlists.map(p => p.id),
            id => queryClient.fetchQuery({
              queryKey: [QueryKeys.Playlist, serverId, id],
              queryFn: () => api.playlists.get(id),
              staleTime: DETAIL_STALE_MS,
            })
          )
          dispatch(setLibraryPlaylists(fullPlaylists))
        }
      } catch (error) {
        toast.error(t('common.syncFailed'));
        console.error('Background enrichment failed:', error);
      }
    })()
  }, [isConnected, activeServer, queryClient, dispatch, api, t])

  return { sync, syncPlaylists, isSyncing, lastSyncedAt }
}
