/**
 * De-duplicates concurrent identical requests.
 *
 * A second tap on a download button, or a re-render that re-fires an effect,
 * otherwise starts a whole second round trip for work already in flight — on
 * Soulseek that means a second 45-second search, and two copies of the same
 * files queued when both finish.
 *
 * Only *concurrent* calls share a result: the entry is dropped as soon as the
 * operation settles, so a retry after a failure genuinely re-runs.
 */
export function createRequestCoalescer<T>() {
  const pending = new Map<string, Promise<T>>();

  return function coalesce(key: string, operation: () => Promise<T>): Promise<T> {
    const inFlight = pending.get(key);
    if (inFlight) return inFlight;

    const started = operation().finally(() => {
      // Guard against clearing a newer entry that reused this key.
      if (pending.get(key) === started) pending.delete(key);
    });
    pending.set(key, started);
    return started;
  };
}
