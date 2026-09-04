import { useEffect, useRef } from 'react';

import { useApi } from '@/api';
import { useAppActive } from '@/hooks/useAppActive';
import { useIsOffline } from '@/hooks/useIsOffline';
import { usePollWhile } from '@/hooks/usePollWhile';
import { useSync } from '@/hooks/useSync';
import { useDownloaderStates, type DownloaderState } from './registry';

// A completed download on a downloader (Lidarr/slskd) writes to the media
// library the same way a manual copy would — the server has no way to know
// until it scans. This poll interval balances "the new album shows up
// promptly" against "we're not hammering an idle downloader all day".
const POLL_INTERVAL_MS = 30_000;

// Some scans take a while on large libraries (multi-thousand album Navidrome
// installs). Refetch a second time later so a slow scan doesn't leave the app
// with a stale library.
const SYNC_DELAYS_MS = [15_000, 60_000];

/**
 * Watches every connected downloader's queue for completions and pulls the
 * freshly-downloaded music into the app: server rescan first, then a forced
 * library sync so the new albums/tracks appear without the user pulling to
 * refresh.
 *
 * Mounted once at the top of the home layout — this is not the settings
 * screen's queue view, which stays for the visible list; this one runs
 * silently in the background so a download that finishes while the user is
 * anywhere else still lands.
 */
export function DownloaderCompletionWatcher() {
  const states = useDownloaderStates();
  return (
    <>
      {states
        .filter((s) => s.isConnected)
        .map((s) => (
          <DownloaderPoller key={s.def.id} state={s} />
        ))}
    </>
  );
}

function DownloaderPoller({ state }: { state: DownloaderState }) {
  const api = useApi();
  const { sync } = useSync();
  const isAppActive = useAppActive();
  const isOffline = useIsOffline();

  const previousQueueRef = useRef<{ id: string }[]>([]);
  const inFlightRef = useRef(false);

  const shouldPoll = state.isConnected && isAppActive && !isOffline;
  const tick = usePollWhile(shouldPoll, POLL_INTERVAL_MS);

  useEffect(() => {
    if (!shouldPoll) return;
    if (inFlightRef.current) return;

    let cancelled = false;
    inFlightRef.current = true;

    state.def
      .fetchQueueWithDiff(state.config, previousQueueRef.current)
      .then(({ currentQueue, finishedItems }) => {
        if (cancelled) return;
        previousQueueRef.current = currentQueue;
        if (finishedItems.length === 0) return;

        // The server can't scrobble what it hasn't scanned, so nudge it first.
        // Errors here are fine to swallow — the server may not have a scan
        // endpoint, or the token may not have permission; the next natural
        // scan still picks up the file eventually.
        api.auth.startScan().catch(() => {});

        // Two staggered forced-syncs pull the new items in even when the scan
        // is slow. force=true bypasses the sync throttle so the second call
        // isn't a no-op after a recent full sync.
        for (const delay of SYNC_DELAYS_MS) {
          setTimeout(() => {
            void sync(true).catch(() => {});
          }, delay);
        }
      })
      .catch(() => {
        // Downloader might be temporarily unreachable; don't reset the
        // previous-queue baseline or a comeback would look like every item
        // completed at once.
      })
      .finally(() => {
        inFlightRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [shouldPoll, tick, state.def, state.config, api, sync]);

  return null;
}
