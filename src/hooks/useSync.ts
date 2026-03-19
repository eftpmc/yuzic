import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useDispatch, useSelector } from 'react-redux'
import { QueryKeys } from '@/enums/queryKeys'
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import { selectLastSyncedAt, selectOfflineModeEnabled } from '@/utils/redux/selectors/settingsSelectors'
import { setLastSyncedAt } from '@/utils/redux/slices/settingsSlice'

const SYNC_THROTTLE_MS = 5 * 60 * 1000

export function useSync() {
  const queryClient = useQueryClient()
  const dispatch = useDispatch()
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
  }, [isConnected, activeServer?.id, offlineModeEnabled, queryClient])

  const sync = useCallback(async () => {
    if (!isConnected || offlineModeEnabled) return
    const now = Date.now()
    if (lastSyncedAt !== null && now - lastSyncedAt < SYNC_THROTTLE_MS) return
    const serverId = activeServer!.id
    setIsSyncing(true)
    try {
      await Promise.allSettled([
        queryClient.refetchQueries({ queryKey: [QueryKeys.Albums, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Artists, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Playlists, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Playlist, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Tracks, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Starred, serverId] }),
        queryClient.refetchQueries({ queryKey: [QueryKeys.Genres, serverId] }),
      ])
      dispatch(setLastSyncedAt(Date.now()))
    } finally {
      setIsSyncing(false)
    }
  }, [isConnected, activeServer?.id, lastSyncedAt, offlineModeEnabled, queryClient, dispatch])

  return { sync, syncPlaylists, isSyncing, lastSyncedAt }
}
