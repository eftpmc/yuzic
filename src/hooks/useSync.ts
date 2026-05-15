import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react'
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
import { setServerAlbumStats, setServerSongStats, clearLocalPlayCounts } from '@/utils/redux/slices/statsSlice'
import { AlbumBase, Artist, PlaylistBase, SongBase, Song } from '@/types'
import { useApi } from '@/api'
import { staleTime } from '@/constants/staleTime'

const SYNC_THROTTLE_MS = 30 * 60 * 1000

let activeSyncServerId: string | null = null
const syncListeners = new Set<() => void>()

function emitSyncState() {
  syncListeners.forEach(listener => listener())
}

function subscribeSyncState(listener: () => void) {
  syncListeners.add(listener)
  return () => {
    syncListeners.delete(listener)
  }
}

function getActiveSyncServerId() {
  return activeSyncServerId
}

export function useSync() {
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const api = useApi()
  const activeServer = useSelector(selectActiveServer)
  const lastSyncedAt = useSelector(selectLastSyncedAt)
  const lastSyncedAtRef = useRef(lastSyncedAt)
  const activeSyncId = useSyncExternalStore(
    subscribeSyncState,
    getActiveSyncServerId,
    getActiveSyncServerId
  )

  const isConnected = !!activeServer?.id && !!activeServer?.isAuthenticated

  useEffect(() => {
    lastSyncedAtRef.current = lastSyncedAt
  }, [lastSyncedAt])

  const syncPlaylists = useCallback(async () => {
    if (!isConnected) return
    const serverId = activeServer!.id
    if (activeSyncServerId === serverId) return
    const playlists = await queryClient.fetchQuery({
      queryKey: [QueryKeys.Playlists, serverId],
      queryFn: api.playlists.list,
      staleTime: 0,
    })
    if (playlists) {
      dispatch(setLibraryPlaylists(playlists))
    }
  }, [api, isConnected, activeServer, queryClient, dispatch])

  const sync = useCallback(async (force = false) => {
    if (!isConnected) return
    const now = Date.now()
    const lastSync = lastSyncedAtRef.current
    if (!force && lastSync !== null && now - lastSync < SYNC_THROTTLE_MS) return
    const serverId = activeServer!.id
    if (activeSyncServerId === serverId) return
    activeSyncServerId = serverId
    emitSyncState()

    try {
      const listStaleTime = force ? 0 : staleTime.albums
      const playlistStaleTime = force ? 0 : staleTime.playlists
      const trackStaleTime = force ? 0 : staleTime.tracks
      const genreStaleTime = force ? 0 : staleTime.genres
      const starredStaleTime = force ? 0 : staleTime.starred

      // Phase 1: fetch all lists in parallel
      const [albumsResult, artistsResult, playlistsResult, tracksResult, starredResult, genresResult] = await Promise.allSettled([
        queryClient.fetchQuery({
          queryKey: [QueryKeys.Albums, serverId],
          queryFn: api.albums.list,
          staleTime: listStaleTime,
        }),
        queryClient.fetchQuery({
          queryKey: [QueryKeys.Artists, serverId],
          queryFn: api.artists.list,
          staleTime: force ? 0 : staleTime.artists,
        }),
        queryClient.fetchQuery({
          queryKey: [QueryKeys.Playlists, serverId],
          queryFn: api.playlists.list,
          staleTime: playlistStaleTime,
        }),
        queryClient.fetchQuery({
          queryKey: [QueryKeys.Tracks, serverId],
          queryFn: api.tracks.list,
          staleTime: trackStaleTime,
        }),
        queryClient.fetchQuery({
          queryKey: [QueryKeys.Starred, serverId],
          queryFn: api.starred.list,
          staleTime: starredStaleTime,
        }),
        queryClient.fetchQuery({
          queryKey: [QueryKeys.Genres, serverId],
          queryFn: api.genres.list,
          staleTime: genreStaleTime,
        }),
      ])

      // Immediately dispatch list-level data so the UI is responsive
      const albums = albumsResult.status === 'fulfilled'
        ? albumsResult.value as AlbumBase[]
        : queryClient.getQueryData<AlbumBase[]>([QueryKeys.Albums, serverId])
      const artists = artistsResult.status === 'fulfilled'
        ? artistsResult.value as Artist[]
        : queryClient.getQueryData<Artist[]>([QueryKeys.Artists, serverId])
      const playlists = playlistsResult.status === 'fulfilled'
        ? playlistsResult.value as PlaylistBase[]
        : queryClient.getQueryData<PlaylistBase[]>([QueryKeys.Playlists, serverId])
      const tracks = tracksResult.status === 'fulfilled'
        ? tracksResult.value as SongBase[]
        : queryClient.getQueryData<SongBase[]>([QueryKeys.Tracks, serverId])
      const genres = genresResult.status === 'fulfilled'
        ? genresResult.value as string[]
        : queryClient.getQueryData<string[]>([QueryKeys.Genres, serverId])
      const starred = starredResult.status === 'fulfilled'
        ? starredResult.value as { songs: Song[] }
        : queryClient.getQueryData<{ songs: Song[] }>([QueryKeys.Starred, serverId])
      const hasAnyLibraryData = !!(
        albums?.length ||
        artists?.length ||
        playlists?.length ||
        tracks?.length ||
        genres?.length ||
        starred?.songs?.length
      )

      if (albums) {
        dispatch(setLibraryAlbums(albums))
        const serverStats = albums
          .filter(a => (a.serverPlayCount ?? 0) > 0 || (a.serverLastPlayedAt ?? 0) > 0)
          .map(a => ({
            id: a.id,
            playCount: a.serverPlayCount ?? 0,
            lastPlayedAt: a.serverLastPlayedAt ?? 0,
          }))
        if (serverStats.length > 0) {
          dispatch(setServerAlbumStats({ serverId, stats: serverStats }))
        }
      }
      if (tracks) {
        dispatch(setLibraryTracks(tracks))
        const songStats = (tracks as SongBase[])
          .filter(t => (t.serverPlayCount ?? 0) > 0 || (t.serverLastPlayedAt ?? 0) > 0)
          .map(t => ({ id: t.id, playCount: t.serverPlayCount ?? 0, lastPlayedAt: t.serverLastPlayedAt }))
        if (songStats.length > 0) {
          dispatch(setServerSongStats({ serverId, stats: songStats }))
        }
        dispatch(clearLocalPlayCounts({ serverId }))
      }
      if (artists) dispatch(setLibraryArtists(artists))
      if (playlists) dispatch(setLibraryPlaylists(playlists))
      if (genres) dispatch(setLibraryGenres({ serverId, genres }))
      if (starred?.songs) dispatch(setLibraryStarred(starred.songs))

      if (hasAnyLibraryData) {
        const syncedAt = Date.now()
        lastSyncedAtRef.current = syncedAt
        dispatch(setLastSyncedAt(syncedAt))
      }
    } finally {
      if (activeSyncServerId === serverId) {
        activeSyncServerId = null
        emitSyncState()
      }
    }
  }, [api, isConnected, activeServer, queryClient, dispatch])

  return { sync, syncPlaylists, isSyncing: activeSyncId === activeServer?.id, lastSyncedAt }
}
