import { useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from '@backpackapp-io/react-native-toast';

import { useApi } from '@/api';
import * as listenbrainz from '@/api/listenbrainz';
import { FAVORITES_ID } from '@/constants/favorites';
import { QueryKeys } from '@/enums/queryKeys';
import { useIsOffline } from '@/hooks/useIsOffline';
import { usePollWhile } from '@/hooks/usePollWhile';
import i18n from '@/i18n';
import {
  affectsLibraryQueries,
  shouldDropMutation,
  type OfflineMutation,
  type ScrobbleDestination,
} from '@/utils/offline/offlineMutations';
import { selectListenBrainzConfig } from '@/utils/redux/selectors/listenbrainzSelectors';
import { selectOfflineMutationQueue } from '@/utils/redux/selectors/offlineMutationsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import {
  markOfflineMutationFailed,
  removeOfflineMutation,
} from '@/utils/redux/slices/offlineMutationsSlice';

const SYNCED_TOAST_ID = 'offline-mutations-synced';
const FAILED_TOAST_ID = 'offline-mutations-failed';
const RETRY_BACKOFF_MS = 60_000;
const RETRY_POLL_MS = 30_000;

type ReplayContext = {
  api: ReturnType<typeof useApi>;
  listenBrainzConfig: ReturnType<typeof selectListenBrainzConfig> | null;
};

async function replayScrobble(
  ctx: ReplayContext,
  mutation: Extract<OfflineMutation, { type: 'scrobble' }>
) {
  switch (mutation.destination) {
    case 'server':
      // The original start time travels with the mutation, so a play submitted
      // hours late is still recorded when it actually happened.
      await ctx.api.songs.scrobble(mutation.songId, mutation.startedAt);
      break;
    case 'listenbrainz':
      // shouldDropMutation discards scrobbles for a disconnected service before
      // they reach here; failing loudly beats a crash if that ever changes.
      if (!ctx.listenBrainzConfig) throw new Error('ListenBrainz is not configured');
      await listenbrainz.submitScrobble(ctx.listenBrainzConfig, {
        artist: mutation.artist,
        track: mutation.track,
        listenedAt: Math.floor(mutation.startedAt / 1000),
        durationSeconds: mutation.durationSeconds,
        durationPlayedSeconds: mutation.listenedSeconds,
        album: mutation.album,
      });
      break;
  }
}

async function replayMutation(ctx: ReplayContext, mutation: OfflineMutation) {
  const api = ctx.api;
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
    case 'scrobble':
      await replayScrobble(ctx, mutation);
      break;
  }
}

export default function OfflineMutationReplayer() {
  const api = useApi();
  const queryClient = useQueryClient();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const queue = useSelector(selectOfflineMutationQueue);
  const listenBrainzConfig = useSelector(selectListenBrainzConfig);
  const isOffline = useIsOffline();
  const isReplayingRef = useRef(false);

  // The listenBrainz config is per-server, and the queue is already filtered
  // to the active server, so it always belongs to the mutations being replayed.
  const configuredDestinations: Record<ScrobbleDestination, boolean> = useMemo(
    () => ({
      server: true,
      listenbrainz: !!listenBrainzConfig?.token,
    }),
    [listenBrainzConfig?.token]
  );

  // nextRetryAt only matters once it's in the past, and nothing else in this
  // component's dependencies changes with the passage of time — without this,
  // a failed mutation's backoff would never actually elapse on its own; it'd
  // only get re-checked if some unrelated change (new mutation, connectivity
  // flip) happened to touch the queue/server/offline deps afterward.
  const hasScheduledRetry = queue.some(item => item.nextRetryAt);
  const retryTick = usePollWhile(hasScheduledRetry, RETRY_POLL_MS);

  useEffect(() => {
    if (isOffline || !activeServer?.id || !activeServer.isAuthenticated) return;
    if (isReplayingRef.current) return;

    const now = Date.now();
    const due = queue.filter(item =>
      item.serverId === activeServer.id &&
      (!item.nextRetryAt || item.nextRetryAt <= now)
    );

    // A scrobble too old to be accepted, or bound for a service the user has
    // since disconnected, is discarded rather than retried until it expires.
    const undeliverable = new Set(
      due.filter(item => shouldDropMutation(item, now, configuredDestinations))
    );
    undeliverable.forEach(item => dispatch(removeOfflineMutation(item.id)));

    const pending = due.filter(item => !undeliverable.has(item));
    if (pending.length === 0) return;

    isReplayingRef.current = true;

    (async () => {
      let syncedCount = 0;
      let syncedLibraryCount = 0;
      let failedCount = 0;

      for (const mutation of pending) {
        try {
          await replayMutation({ api, listenBrainzConfig }, mutation);
          dispatch(removeOfflineMutation(mutation.id));
          syncedCount += 1;
          if (affectsLibraryQueries(mutation)) syncedLibraryCount += 1;
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

      // Only library changes need a refetch. Scrobbles record a play and leave
      // starred items and playlists alone, so a backlog of them arriving on
      // reconnect must not drag the whole library down the connection that
      // just came back.
      if (syncedLibraryCount > 0) {
        queryClient.invalidateQueries({ queryKey: [QueryKeys.Starred] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.Playlists, activeServer.id] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.Playlist, activeServer.id] });
        queryClient.invalidateQueries({
          queryKey: [QueryKeys.Playlist, activeServer.id, FAVORITES_ID],
        });
      }

      if (syncedCount > 0) {
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
  }, [
    activeServer, api, dispatch, isOffline, queryClient, queue, retryTick,
    listenBrainzConfig, configuredDestinations,
  ]);

  return null;
}
