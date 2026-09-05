import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

import { useApi } from '@/api';
import type { ServerPlayQueue } from '@/api/types';
import type { Song } from '@/types';
import { selectLibraryTracks } from '@/utils/redux/selectors/librarySelectors';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import { selectQueueSyncEnabled } from '@/utils/redux/selectors/settingsSelectors';
import { selectPersistedPlaybackQueue } from '@/utils/redux/selectors/playbackSelectors';
import { usePlayingActions, usePlayingState } from '@/contexts/PlayingContext';

/**
 * How stale a saved server queue can be before we stop offering it. Two days
 * covers the "one device died, other picked up the day after" story without
 * inviting a "resume this playlist you last played three weeks ago" prompt.
 */
const MAX_QUEUE_AGE_HOURS = 48;

const DISMISSED_KEY_PREFIX = 'queue-restore-dismissed:';

let sessionDismissed = new Set<string>();

function isStale(queue: ServerPlayQueue | null): boolean {
  if (!queue?.changed) return false;
  const changedAt = Date.parse(queue.changed);
  if (Number.isNaN(changedAt)) return false;
  return Date.now() - changedAt > MAX_QUEUE_AGE_HOURS * 60 * 60 * 1000;
}

/**
 * Fallback path for cold start: if local persisted playback is empty (fresh
 * install, cleared data, first launch on a new device) AND the server has a
 * queue to offer, show the banner. When local is present, PlayingContext
 * auto-restores it silently and this hook never fires — the banner isn't a
 * general "resume?" prompt, it's the specific "you have nothing locally,
 * want the server's copy?" prompt.
 *
 * Gated on the same queue-sync setting that governs the upload side: a user
 * who turned queue sync off asked not to have their queue travel through the
 * server, and reading it back is the same wire.
 */
export function useResumableServerQueue() {
  const api = useApi();
  const serverId = useSelector(selectActiveServerId);
  const tracks = useSelector(selectLibraryTracks);
  const persistedQueue = useSelector(selectPersistedPlaybackQueue);
  const queueSyncEnabled = useSelector(selectQueueSyncEnabled);
  const { currentSong, isPlaying } = usePlayingState();
  const { playSongs } = usePlayingActions();

  const [available, setAvailable] = useState<ServerPlayQueue | null>(null);
  const [resuming, setResuming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!api.queue || !serverId || !queueSyncEnabled) return;
      if (currentSong || isPlaying) return; // Already listening — don't offer.
      if (persistedQueue.length > 0) return; // Local memory is the primary source.
      const key = `${DISMISSED_KEY_PREFIX}${serverId}`;
      if (sessionDismissed.has(key)) return;

      try {
        const q = await api.queue.get();
        if (cancelled) return;
        if (!q || q.songIds.length === 0) return;
        if (isStale(q)) return;
        setAvailable(q);
      } catch {
        // Silent — no server queue is fine.
      }
    }
    void check();
    return () => { cancelled = true; };
  }, [api.queue, serverId, queueSyncEnabled, currentSong, isPlaying, persistedQueue.length]);

  const dismiss = useCallback(() => {
    if (serverId) sessionDismissed.add(`${DISMISSED_KEY_PREFIX}${serverId}`);
    setAvailable(null);
  }, [serverId]);

  const resume = useCallback(async () => {
    if (!available || resuming) return;
    setResuming(true);
    try {
      // Resolve each song id to a library track. Anything the library doesn't
      // know about (a track from a shared server, since deleted) is skipped —
      // partial resume beats no resume.
      const byId = new Map(tracks.map((t) => [t.id, t]));
      const resolved: Song[] = [];
      for (const id of available.songIds) {
        const t = byId.get(id);
        if (t) resolved.push({ ...(t as unknown as Song), streamUrl: '' });
      }
      if (resolved.length === 0) {
        dismiss();
        return;
      }
      const currentIndex = available.currentSongId
        ? Math.max(0, resolved.findIndex((s) => s.id === available.currentSongId))
        : 0;
      await playSongs(resolved, { startIndex: currentIndex });
      setAvailable(null);
    } finally {
      setResuming(false);
    }
  }, [available, resuming, tracks, playSongs, dismiss]);

  return { available, resuming, resume, dismiss };
}
