import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector, useStore } from 'react-redux'
import { RootState } from '@/utils/redux/store'
import { QueryKeys } from '@/enums/queryKeys'
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import { selectLastSyncedAt, selectOfflineModeEnabled } from '@/utils/redux/selectors/settingsSelectors'
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

export function useSync() {
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
  const api = useApi()
  const activeServer = useSelector(selectActiveServer)
  const lastSyncedAt = useSelector(selectLastSyncedAt)
  const offlineModeEnabled = useSelector(selectOfflineModeEnabled)
  const store = useStore()
  const [isSyncing, setIsSyncing] = useState(false)

  const isConnected = !!activeServer?.id && !!activeServer?.isAuthenticated

  const syncPlaylists = useCallback(async (overwrite = false) => {
    if (!isConnected || offlineModeEnabled) return
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
      const library = (store.getState() as RootState).library
      const fulfilled = results
        .filter((r): r is PromiseFulfilledResult<Playlist> => r.status === 'fulfilled')
        .map(r => r.value)
      if (overwrite || library.playlists.length === 0) {
        dispatch(setLibraryPlaylists(fulfilled))
      }
    }
  }, [isConnected, activeServer?.id, offlineModeEnabled, queryClient, dispatch, api, store])

  const sync = useCallback(async (force = false, overwrite = false) => {
    if (!isConnected || offlineModeEnabled) return
    const now = Date.now()
    if (!force && lastSyncedAt !== null && now - lastSyncedAt < SYNC_THROTTLE_MS) return
    const serverId = activeServer!.id
    setIsSyncing(true)
    try {
      // 1. Refetch lists
      await Promise.allSettled([
        queryClient.refetchQueries({ queryKey: [QueryKeys.Albums, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Artists, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Playlists, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Tracks, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Starred, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Genres, serverId] }),
      ])

      const library = (store.getState() as RootState).library

      // 2. Seed simple lists directly
      const tracks = queryClient.getQueryData<SongBase[]>([QueryKeys.Tracks, serverId])
      const genres = queryClient.getQueryData<string[]>([QueryKeys.Genres, serverId])
      const starred = queryClient.getQueryData<{ songs: Song[] }>([QueryKeys.Starred, serverId])
      if (tracks && (overwrite || library.tracks.length === 0)) dispatch(setLibraryTracks(tracks))
      if (genres && (overwrite || library.genres.length === 0)) dispatch(setLibraryGenres(genres))
      if (starred?.songs && (overwrite || library.starred.length === 0)) dispatch(setLibraryStarred(starred.songs))

      // 3. N+1: fetch full albums
      const albums = queryClient.getQueryData<Album[]>([QueryKeys.Albums, serverId])
      let fullAlbumMap = new Map<string, Album>()
      if (albums) {
        const albumResults = await Promise.allSettled(
          albums.map(a =>
            queryClient.fetchQuery({
              queryKey: [QueryKeys.Album, serverId, a.id],
              queryFn: () => api.albums.get(a.id),
              staleTime: 0,
            })
          )
        )
        const fullAlbums = albumResults
          .filter((r): r is PromiseFulfilledResult<Album> => r.status === 'fulfilled')
          .map(r => r.value)
        fullAlbums.forEach(a => fullAlbumMap.set(a.id, a))
        if (overwrite || library.albums.length === 0) dispatch(setLibraryAlbums(fullAlbums))
      }

      // 3b. N+1: fetch full artists, then hydrate ownedAlbums from fullAlbumMap
      const artists = queryClient.getQueryData<Artist[]>([QueryKeys.Artists, serverId])
      if (artists) {
        const artistResults = await Promise.allSettled(
          artists.map(a =>
            queryClient.fetchQuery({
              queryKey: [QueryKeys.Artist, serverId, a.id],
              queryFn: () => api.artists.get(a.id),
              staleTime: 0,
            })
          )
        )
        const fullArtists = artistResults
          .filter((r): r is PromiseFulfilledResult<Artist> => r.status === 'fulfilled')
          .map(r => r.value)
          .map(artist => ({
            ...artist,
            ownedAlbums: artist.ownedAlbums.map(a => fullAlbumMap.get(a.id) ?? a),
          }))
        if (overwrite || library.artists.length === 0) dispatch(setLibraryArtists(fullArtists))
      }

      // 3c. N+1: fetch full playlists
      const playlists = queryClient.getQueryData<Playlist[]>([QueryKeys.Playlists, serverId])
      if (playlists) {
        const playlistResults = await Promise.allSettled(
          playlists.map(p =>
            queryClient.fetchQuery({
              queryKey: [QueryKeys.Playlist, serverId, p.id],
              queryFn: () => api.playlists.get(p.id),
              staleTime: 0,
            })
          )
        )
        const fullPlaylists = playlistResults
          .filter((r): r is PromiseFulfilledResult<Playlist> => r.status === 'fulfilled')
          .map(r => r.value)
        if (overwrite || library.playlists.length === 0) dispatch(setLibraryPlaylists(fullPlaylists))
      }

      dispatch(setLastSyncedAt(Date.now()))
    } finally {
      setIsSyncing(false)
    }
  }, [isConnected, activeServer?.id, lastSyncedAt, offlineModeEnabled, queryClient, dispatch, api, store])

  return { sync, syncPlaylists, isSyncing, lastSyncedAt }
}
