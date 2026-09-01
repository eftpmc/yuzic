import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@backpackapp-io/react-native-toast';

import { useAppActive } from '@/hooks/useAppActive';
import { usePollWhile } from '@/hooks/usePollWhile';
import type { DownloaderConfig } from './useDownloaderConnection';

export const QUEUE_POLL_MS = 10_000;

export type QueueDiff<T> = {
  currentQueue: T[];
  finishedItems: T[];
};

/**
 * Polls a downloader's transfer queue while the screen can actually be seen.
 *
 * Polling is gated on the app being foregrounded: the interval used to keep
 * firing after the user left the app, spending battery and data on a screen
 * nobody was looking at. Coming back to the foreground polls immediately rather
 * than waiting out the remainder of an interval.
 */
export function useDownloaderQueue<T extends { id: string }>(
  config: DownloaderConfig,
  isAuthenticated: boolean,
  fetchQueueWithDiff: (config: DownloaderConfig, previous: T[]) => Promise<QueueDiff<T>>
) {
  const { t } = useTranslation();
  const isAppActive = useAppActive();

  // Held in a ref rather than listed as an effect dependency: a new `t`
  // identity is not a reason to re-read the queue, and treating it as one turns
  // every render into another request.
  const translate = useRef(t);
  translate.current = t;

  const [queue, setQueue] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const previousQueueRef = useRef<T[]>([]);
  // Tracked separately from the queue contents: an empty queue is a perfectly
  // good result, and treating it as "not read yet" re-flashed the spinner over
  // the empty-state message on every tick.
  const hasReadRef = useRef(false);
  const inFlightRef = useRef(false);

  const configured = !!config.serverUrl && !!config.apiKey && isAuthenticated;
  const shouldPoll = configured && isAppActive;
  const tick = usePollWhile(shouldPoll, QUEUE_POLL_MS);

  const reset = useCallback(() => {
    setQueue([]);
    previousQueueRef.current = [];
    hasReadRef.current = false;
    inFlightRef.current = false;
    setIsLoading(false);
    setHasError(false);
  }, []);

  useEffect(() => {
    if (!configured) reset();
  }, [configured, reset]);

  useEffect(() => {
    if (!shouldPoll) return;

    // A read slower than the poll interval would otherwise stack requests
    // against a server that is already struggling.
    if (inFlightRef.current) return;

    let cancelled = false;
    inFlightRef.current = true;
    // Only the first read shows the spinner; later ticks refresh in place so
    // the list doesn't flash on every interval.
    if (!hasReadRef.current) setIsLoading(true);

    fetchQueueWithDiff(config, previousQueueRef.current)
      .then(({ currentQueue, finishedItems }) => {
        if (cancelled) return;
        hasReadRef.current = true;
        previousQueueRef.current = currentQueue;
        setQueue(currentQueue);
        setHasError(false);
        if (finishedItems.length > 0) {
          toast(translate.current('settings.downloaders.downloadComplete'));
        }
      })
      .catch(() => {
        if (cancelled) return;
        hasReadRef.current = true;
        setHasError(true);
      })
      .finally(() => {
        inFlightRef.current = false;
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `tick` re-runs the read on each poll interval.
  }, [shouldPoll, tick, config, fetchQueueWithDiff]);

  return { queue, isLoading, hasError };
}
