import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useApi } from '@/api';
import { useAppActive } from '@/hooks/useAppActive';
import { useIsOffline } from '@/hooks/useIsOffline';
import { usePollWhile } from '@/hooks/usePollWhile';
import { useSync } from '@/hooks/useSync';
import { useDownloaderStates, type DownloaderState } from './registry';
import type { DownloaderId } from '@/utils/redux/slices/downloadersSlice';

// A completed download on a downloader (Lidarr/slskd) writes to the media
// library the same way a manual copy would — the server has no way to know
// until it scans. This poll interval balances "the new album shows up
// promptly" against "we're not hammering an idle downloader all day".
const POLL_INTERVAL_MS = 30_000;

// Some scans take a while on large libraries (multi-thousand album Navidrome
// installs). Refetch a second time later so a slow scan doesn't leave the app
// with a stale library.
const SYNC_DELAYS_MS = [15_000, 60_000];

export type DownloaderQueueSnapshot = {
  id: DownloaderId;
  label: string;
  count: number;
};

type ContextValue = {
  /** Live count per connected downloader. Empty when nothing is queued. */
  queues: DownloaderQueueSnapshot[];
  /** Total items across all connected downloaders. */
  totalInFlight: number;
};

const DownloadersQueueContext = createContext<ContextValue>({
  queues: [],
  totalInFlight: 0,
});

/**
 * The single background poller for every connected downloader. Its two jobs:
 *
 *   1. Detect completions (items that disappeared since the last read) and
 *      trigger a server rescan + forced library sync — the same
 *      "post-download library refresh" the old DownloaderCompletionWatcher
 *      did on its own.
 *   2. Expose the live queue count per downloader so surfaces (a Home
 *      banner today, other places later) can read a fresh snapshot
 *      without spinning up a second poller against the same server.
 *
 * Mounted once at the top of the home layout.
 */
export function DownloadersQueueProvider({ children }: { children: ReactNode }) {
  const states = useDownloaderStates();
  const api = useApi();
  const { sync } = useSync();
  const isAppActive = useAppActive();
  const isOffline = useIsOffline();

  const [queues, setQueues] = useState<DownloaderQueueSnapshot[]>([]);

  // One previous-queue ref per downloader id — a Map, so add/remove
  // downloaders don't shift indices under an in-flight poll.
  const previousQueuesRef = useRef<Map<DownloaderId, { id: string }[]>>(new Map());
  const inFlightRef = useRef<Set<DownloaderId>>(new Set());

  const connectedStates = useMemo(() => states.filter((s) => s.isConnected), [states]);
  const shouldPoll = connectedStates.length > 0 && isAppActive && !isOffline;
  const tick = usePollWhile(shouldPoll, POLL_INTERVAL_MS);

  const pollOne = useCallback(async (state: DownloaderState) => {
    if (inFlightRef.current.has(state.def.id)) return;
    inFlightRef.current.add(state.def.id);
    const previous = previousQueuesRef.current.get(state.def.id) ?? [];
    try {
      const { currentQueue, finishedItems } = await state.def.fetchQueueWithDiff(state.config, previous);
      previousQueuesRef.current.set(state.def.id, currentQueue);
      setQueues((prev) => {
        const filtered = prev.filter((q) => q.id !== state.def.id);
        return currentQueue.length > 0
          ? [...filtered, { id: state.def.id, label: state.def.label, count: currentQueue.length }]
          : filtered;
      });
      if (finishedItems.length > 0) {
        // Server rescan + staggered library refetch — same as before, just
        // living here instead of in a per-downloader component.
        api.auth.startScan().catch(() => {});
        for (const delay of SYNC_DELAYS_MS) {
          setTimeout(() => { void sync(true).catch(() => {}); }, delay);
        }
      }
    } catch {
      // Transient reachability failure; leave previous baseline in place.
    } finally {
      inFlightRef.current.delete(state.def.id);
    }
  }, [api.auth, sync]);

  useEffect(() => {
    if (!shouldPoll) return;
    let cancelled = false;
    for (const state of connectedStates) {
      if (cancelled) break;
      void pollOne(state);
    }
    return () => { cancelled = true; };
  }, [shouldPoll, tick, connectedStates, pollOne]);

  // Clean up snapshots for downloaders that got disconnected.
  useEffect(() => {
    const connectedIds = new Set(connectedStates.map((s) => s.def.id));
    setQueues((prev) => prev.filter((q) => connectedIds.has(q.id)));
    for (const id of Array.from(previousQueuesRef.current.keys())) {
      if (!connectedIds.has(id)) previousQueuesRef.current.delete(id);
    }
  }, [connectedStates]);

  const value = useMemo<ContextValue>(() => ({
    queues,
    totalInFlight: queues.reduce((sum, q) => sum + q.count, 0),
  }), [queues]);

  return (
    <DownloadersQueueContext.Provider value={value}>
      {children}
    </DownloadersQueueContext.Provider>
  );
}

export function useDownloadersQueue(): ContextValue {
  return useContext(DownloadersQueueContext);
}
