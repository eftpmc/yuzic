import { useCallback, useEffect, useRef } from 'react';

import { useApi } from '@/api';
import type { Song } from '@/types';
import { getContentKind } from '@/utils/playback/contentKind';

/**
 * Subsonic servers store one play queue per user; saving it here means opening
 * yuzic on another device (or reinstalling) can resume where the last session
 * left off. Only real library songs go up — radio and podcast entries synthesize
 * their id namespace and would be unresolvable when someone else's client
 * asked for them by id.
 */

// The queue changes on every track advance; saving on every change would flood
// the server on a long shuffle. This is the minimum gap between two saves.
const SAVE_MIN_INTERVAL_MS = 15_000;

function isServerAddressable(song: Song): boolean {
  return getContentKind(song) === 'song' && !!song.id;
}

export function useQueueSync() {
  const api = useApi();
  const supported = Boolean(api.queue);

  const lastSavedAtRef = useRef(0);
  const lastSignatureRef = useRef<string>('');
  const inFlightRef = useRef(false);

  const save = useCallback(
    async (queue: Song[], currentSongId: string | undefined, positionMs: number) => {
      if (!supported || !api.queue || inFlightRef.current) return;

      const ids = queue.filter(isServerAddressable).map((s) => s.id);
      if (!ids.length) return;

      // Nothing changed since the last successful save — the position update
      // alone is worth going through, but let the periodic tick handle it.
      const signature = `${currentSongId ?? ''}|${ids.join(',')}`;
      const sameQueueAsBefore = signature === lastSignatureRef.current;

      const now = Date.now();
      if (sameQueueAsBefore && now - lastSavedAtRef.current < SAVE_MIN_INTERVAL_MS) return;

      inFlightRef.current = true;
      try {
        await api.queue.save({
          songIds: ids,
          currentSongId: currentSongId && ids.includes(currentSongId) ? currentSongId : ids[0],
          positionMs: Math.max(0, Math.floor(positionMs)),
        });
        lastSavedAtRef.current = now;
        lastSignatureRef.current = signature;
      } catch {
        // Cross-device queue is best-effort; a failed save just means the
        // other device might not see this session's queue immediately.
      } finally {
        inFlightRef.current = false;
      }
    },
    [api.queue, supported]
  );

  return { supported, save };
}

/**
 * Effect hook: throttled save whenever a queue exists and either the current
 * song id or the queue identity changes. Callers pass live values from the
 * playing context; the hook handles debouncing and best-effort delivery.
 */
export function useQueueSyncEffect(
  queue: Song[],
  currentSong: Song | null,
  positionMs: number
) {
  const { supported, save } = useQueueSync();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supported) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    // Small debounce so a rapid skip-skip-skip doesn't turn into three POSTs.
    timeoutRef.current = setTimeout(() => {
      void save(queue, currentSong?.id, positionMs);
    }, 1500);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [supported, save, queue, currentSong?.id, positionMs]);
}
