import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import type { RepeatModeState, ShuffleMode } from '@/contexts/PlayingContext';
import type { Song } from '@/types';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import {
  selectPersistedPlaybackActiveServerId,
} from '@/utils/redux/selectors/playbackSelectors';
import {
  resetPlaybackForServer,
  setPlaybackCurrentIndex,
  setPlaybackPosition,
  setPlaybackQueue,
  setPlaybackRepeatMode,
  setPlaybackShuffleMode,
} from '@/utils/redux/slices/playbackSlice';

/**
 * The bridge between the in-memory PlayingContext and the persisted
 * playbackSlice. Callers dispatch small updates through this hook rather
 * than talking to the slice directly, so the write-throttling for the
 * position tick lives in one place and the server-switch invalidation
 * happens automatically.
 *
 * The read side stays in PlayingContext (on mount, it reads the slice and
 * loads the queue). This module owns the write side.
 */

/** Position ticks in every second; persist every N ticks + on track change +
 * on pause. 5s balances "resume feels precise" against "MMKV writes". */
const POSITION_PERSIST_INTERVAL_MS = 5_000;

export function usePlaybackPersistence() {
  const dispatch = useDispatch();
  const activeServerId = useSelector(selectActiveServerId);
  const persistedServerId = useSelector(selectPersistedPlaybackActiveServerId);

  // If the active server changed under the persisted state, wipe. Song ids
  // in the slice belong to whichever server was active when they were saved.
  // Do this before any other write reaches the slice so the reset can't
  // race with an in-flight setPlaybackQueue for the new server.
  useEffect(() => {
    if (activeServerId && persistedServerId && persistedServerId !== activeServerId) {
      dispatch(resetPlaybackForServer({ activeServerId }));
    }
  }, [activeServerId, persistedServerId, dispatch]);

  const lastPositionWriteAtRef = useRef(0);

  const persistQueue = useCallback((args: {
    queue: Song[];
    currentIndex: number;
    repeatMode: RepeatModeState;
    shuffleMode: ShuffleMode;
  }) => {
    // Skip non-server-addressable items (radio, podcast) — they synthesize
    // ids no other client (or this client on the next run) could resolve.
    // Their playback is transient by nature; nobody expects to "resume the
    // radio station I was on" through queue persistence.
    const ids = args.queue
      .filter((s) => (s.contentKind ?? 'song') === 'song')
      .map((s) => s.id);
    // Dropping those items shifts everything after them, so the index has to
    // be re-found rather than clamped: the current song's own id is what says
    // where it ended up. It has no place in the saved list only when it is
    // itself one of the dropped kinds, and then the clamp is all there is.
    const currentId = args.queue[args.currentIndex]?.id;
    const mappedIndex = currentId ? ids.indexOf(currentId) : -1;
    dispatch(setPlaybackQueue({
      activeServerId,
      queueSongIds: ids,
      currentIndex: mappedIndex >= 0
        ? mappedIndex
        : Math.min(args.currentIndex, Math.max(0, ids.length - 1)),
      repeatMode: args.repeatMode,
      shuffleMode: args.shuffleMode,
    }));
  }, [activeServerId, dispatch]);

  const persistCurrentIndex = useCallback((currentIndex: number) => {
    dispatch(setPlaybackCurrentIndex({ currentIndex }));
  }, [dispatch]);

  /** Throttled — called every second by PlayingProgress; only writes to the
   * slice every 5s. Force=true bypasses the throttle for track-change and
   * pause events, where the latest position is the whole point. */
  const persistPosition = useCallback((positionSeconds: number, opts: { force?: boolean } = {}) => {
    const now = Date.now();
    if (!opts.force && now - lastPositionWriteAtRef.current < POSITION_PERSIST_INTERVAL_MS) return;
    lastPositionWriteAtRef.current = now;
    dispatch(setPlaybackPosition({ positionMs: Math.floor(positionSeconds * 1000) }));
  }, [dispatch]);

  const persistRepeatMode = useCallback((mode: RepeatModeState) => {
    dispatch(setPlaybackRepeatMode(mode));
  }, [dispatch]);

  const persistShuffleMode = useCallback((mode: ShuffleMode) => {
    dispatch(setPlaybackShuffleMode(mode));
  }, [dispatch]);

  return {
    persistQueue,
    persistCurrentIndex,
    persistPosition,
    persistRepeatMode,
    persistShuffleMode,
  };
}
