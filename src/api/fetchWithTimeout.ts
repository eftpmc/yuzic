/**
 * Default ceiling for a single integration request. The core server clients
 * already cap their requests; integrations used to have no ceiling at all, so a
 * wrong URL or a black-holed connection left the caller's spinner up forever.
 */
export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;

/** Thrown instead of the platform's `AbortError` so callers can tell a timeout
 * apart from a caller-initiated abort. */
export class RequestTimeoutError extends Error {
  constructor(timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'RequestTimeoutError';
  }
}

export type FetchWithTimeoutOptions = RequestInit & {
  /** Overrides {@link DEFAULT_REQUEST_TIMEOUT_MS}. */
  timeoutMs?: number;
};

/**
 * `fetch` with a hard deadline. A caller-supplied `signal` still aborts the
 * request; the deadline only adds an upper bound on top of it.
 */
export async function fetchWithTimeout(
  input: string,
  { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, signal, ...init }: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  const abortFromCaller = () => controller.abort();
  signal?.addEventListener('abort', abortFromCaller, { once: true });

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    // The platform reports both the deadline and a caller abort as the same
    // AbortError, so distinguish them from our own bookkeeping.
    if (timedOut && !signal?.aborted) throw new RequestTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abortFromCaller);
  }
}
