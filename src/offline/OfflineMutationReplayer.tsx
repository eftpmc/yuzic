import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from '@backpackapp-io/react-native-toast';

import { useApi } from '@/api';
import { FAVORITES_ID } from '@/constants/favorites';
import { QueryKeys } from '@/enums/queryKeys';
import { useIsOffline } from '@/hooks/useIsOffline';
import i18n from '@/i18n';
import { OfflineMutation } from '@/utils/offline/offlineMutations';
import { selectOfflineMutationQueue } from '@/utils/redux/selectors/offlineMutationsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import {
  markOfflineMutationFailed,
  removeOfflineMutation,
} from '@/utils/redux/slices/offlineMutationsSlice';

const SYNCED_TOAST_ID = 'offline-mutations-synced';
const FAILED_TOAST_ID = 'offline-mutations-failed';
const RETRY_BACKOFF_MS = 60_000;

async function replayMutation(api: ReturnType<typeof useApi>, mutation: OfflineMutation) {
  switch (mutation.type) {
    case 'starSong':
      await api.starred.add(mutation.song.id);
      break;
    case 'unstarSong':
      await api.starred.remove(mutation.songId);
      break;
    case 'addSongToPlaylist':
      await api.playlists.addSong(mutation.playlistId, mutation.song.id);
      break;
    case 'removeSongFromPlaylist':
      await api.playlists.removeSong(mutation.playlistId, mutation.songId);
      break;
    case 'deletePlaylist':
      await api.playlists.delete(mutation.playlistId);
      break;
  }
}

export default function OfflineMutationReplayer() {
  const api = useApi();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const queue = useSelector(selectOfflineMutationQueue);
  const isOffline = useIsOffline();
  const isReplayingRef = useRef(false);

  useEffect(() => {
    if (isOffline || !activeServer?.id || !activeServer.isAuthenticated) return;
    if (isReplayingRef.current) return;

    const now = Date.now();
    const pending = queue.filter(item =>
      item.serverId === activeServer.id &&
      (!item.nextRetryAt || item.nextRetryAt <= now)
    );
    if (pending.length === 0) return;

    isReplayingRef.current = true;

    (async () => {
      let syncedCount = 0;
      let failedCount = 0;

      for (const mutation of pending) {
        try {
          await replayMutation(api, mutation);
          dispatch(removeOfflineMutation(mutation.id));
          syncedCount += 1;
        } catch (error) {
          const failedAt = Date.now();
          const retryCount = (mutation.retryCount ?? 0) + 1;
          const delay = Math.min(RETRY_BACKOFF_MS * retryCount, 5 * RETRY_BACKOFF_MS);

          dispatch(markOfflineMutationFailed({
            id: mutation.id,
            error: error instanceof Error ? error.message : i18n.t('common.error.unexpected'),
            failedAt,
            nextRetryAt: failedAt + delay,
          }));
          failedCount += 1;
        }
      }

      if (syncedCount > 0) {
        queryClient.invalidateQueries({ queryKey: [QueryKeys.Starred] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.Playlists, activeServer.id] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.Playlist, activeServer.id] });
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.Playlist, activeServer.id, FAVORITES_ID],
        });
        toast.success(i18n.t('common.offline.syncedChanges'), {
          id: SYNCED_TOAST_ID,
        });
      }

      if (failedCount > 0) {
        toast.error(i18n.t('common.offline.syncQueuedChangesFailed'), {
          id: FAILED_TOAST_ID,
        });
      }

      isReplayingRef.current = false;
    })().catch(() => {
      isReplayingRef.current = false;
    });
  }, [activeServer, api, dispatch, isOffline, queryClient, queue]);

  return null;
}
