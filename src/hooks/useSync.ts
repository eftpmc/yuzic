import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
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
  const [isSyncing, setIsSyncing] = useState(false)

  const isConnected = !!activeServer?.id && !!activeServer?.isAuthenticated

  const syncPlaylists = useCallback(async () => {
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
      dispatch(
        setLibraryPlaylists(
          results
            .filter((r): r is PromiseFulfilledResult<Playlist> => r.status === 'fulfilled')
            .map(r => r.value)
        )
      )
    }
  }, [isConnected, activeServer?.id, offlineModeEnabled, queryClient, dispatch, api])

  const sync = useCallback(async (force = false) => {
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

      // 2. Seed simple lists directly
      const tracks = queryClient.getQueryData<SongBase[]>([QueryKeys.Tracks, serverId])
      const genres = queryClient.getQueryData<string[]>([QueryKeys.Genres, serverId])
      const starred = queryClient.getQueryData<{ songs: Song[] }>([QueryKeys.Starred, serverId])
      if (tracks) dispatch(setLibraryTracks(tracks))
      if (genres) dispatch(setLibraryGenres(genres))
      if (starred?.songs) dispatch(setLibraryStarred(starred.songs))

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
        dispatch(setLibraryAlbums(fullAlbums))
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
        dispatch(
          setLibraryArtists(
            artistResults
              .filter((r): r is PromiseFulfilledResult<Artist> => r.status === 'fulfilled')
              .map(r => r.value)
              .map(artist => ({
                ...artist,
                ownedAlbums: artist.ownedAlbums.map(a => fullAlbumMap.get(a.id) ?? a),
              }))
          )
        )
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
        dispatch(
          setLibraryPlaylists(
            playlistResults
              .filter((r): r is PromiseFulfilledResult<Playlist> => r.status === 'fulfilled')
              .map(r => r.value)
          )
        )
      }

      dispatch(setLastSyncedAt(Date.now()))
    } finally {
      setIsSyncing(false)
    }
  }, [isConnected, activeServer?.id, lastSyncedAt, offlineModeEnabled, queryClient, dispatch, api])

  return { sync, syncPlaylists, isSyncing, lastSyncedAt }
}
