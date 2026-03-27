import { useCallback, useState } from 'react'
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

const SYNC_THROTTLE_MS = 30 * 60 * 1000
// Re-use cached detail data if fetched within the last 5 minutes
const DETAIL_STALE_MS = 5 * 60 * 1000
// Max concurrent N+1 requests to avoid overwhelming the server
const N1_CONCURRENCY = 15

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
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const api = useApi()
  const activeServer = useSelector(selectActiveServer)
  const lastSyncedAt = useSelector(selectLastSyncedAt)
  const [isSyncing, setIsSyncing] = useState(false)

  const isConnected = !!activeServer?.id && !!activeServer?.isAuthenticated

  const syncPlaylists = useCallback(async () => {
    if (!isConnected) return
    const serverId = activeServer!.id
    await Promise.allSettled([
      queryClient.refetchQueries({ queryKey: [QueryKeys.Playlists, serverId] }),
      queryClient.refetchQueries({ queryKey: [QueryKeys.Playlist, serverId] }),
    ])

    const playlists = queryClient.getQueryData<Playlist[]>([QueryKeys.Playlists, serverId])
    if (playlists) {
      const results = await Promise.allSettled(
        playlists.map(p =>
          queryClient.fetchQuery({
            queryKey: [QueryKeys.Playlist, serverId, p.id],
            queryFn: () => api.playlists.get(p.id),
            staleTime: 0,
          })
        )
      )
      const fulfilled = results
        .filter((r): r is PromiseFulfilledResult<Playlist> => r.status === 'fulfilled')
        .map(r => r.value)
      dispatch(setLibraryPlaylists(fulfilled))
    }
  }, [isConnected, activeServer?.id, queryClient, dispatch, api])

  const sync = useCallback(async (force = false) => {
    if (!isConnected) return
    const now = Date.now()
    if (!force && lastSyncedAt !== null && now - lastSyncedAt < SYNC_THROTTLE_MS) return
    const serverId = activeServer!.id
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

      if (albums) dispatch(setLibraryAlbums(albums))
      if (artists) dispatch(setLibraryArtists(artists))
      if (playlists) dispatch(setLibraryPlaylists(playlists))
      if (tracks) dispatch(setLibraryTracks(tracks))
      if (genres) dispatch(setLibraryGenres(genres))
      if (starred?.songs) dispatch(setLibraryStarred(starred.songs))

      dispatch(setLastSyncedAt(Date.now()))
    } finally {
      setIsSyncing(false)
    }

    // Phase 2: background enrichment — fetch full detail (with songs) without blocking the UI
    ;(async () => {
      try {
        const albums = queryClient.getQueryData<Album[]>([QueryKeys.Albums, serverId])
        const fullAlbumMap = new Map<string, Album>()

        if (albums) {
          const fullAlbums = await fetchBatch(
            albums.map(a => a.id),
            id => queryClient.fetchQuery({
              queryKey: [QueryKeys.Album, serverId, id],
              queryFn: () => api.albums.get(id),
              staleTime: DETAIL_STALE_MS,
            })
          )
          fullAlbums.forEach(a => fullAlbumMap.set(a.id, a))
          dispatch(setLibraryAlbums(fullAlbums))

          // Derive tracks from enriched album songs so the tracks/downloaded
          // library filters are always populated after Phase 2, even if the
          // QueryKeys.Tracks query hasn't run yet (no active subscriber).
          const allSongs: SongBase[] = []
          fullAlbums.forEach(album => album.songs.forEach(song => allSongs.push(song)))
          if (allSongs.length > 0) dispatch(setLibraryTracks(allSongs))
        }

        const artists = queryClient.getQueryData<Artist[]>([QueryKeys.Artists, serverId])
        if (artists) {
          const fullArtists = await fetchBatch(
            artists.map(a => a.id),
            id => queryClient.fetchQuery({
              queryKey: [QueryKeys.Artist, serverId, id],
              queryFn: () => api.artists.get(id),
              staleTime: DETAIL_STALE_MS,
            })
          )
          dispatch(setLibraryArtists(
            fullArtists.map(artist => ({
              ...artist,
              ownedAlbums: artist.ownedAlbums.map(a => fullAlbumMap.get(a.id) ?? a),
            }))
          ))
        }

        const playlists = queryClient.getQueryData<Playlist[]>([QueryKeys.Playlists, serverId])
        if (playlists) {
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
      } catch {
        // background enrichment failures are silent
      }
    })()
  }, [isConnected, activeServer?.id, lastSyncedAt, queryClient, dispatch, api])

  return { sync, syncPlaylists, isSyncing, lastSyncedAt }
}
