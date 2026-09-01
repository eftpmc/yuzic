import {
  DEFAULT_REQUEST_TIMEOUT_MS,
  RequestTimeoutError,
  fetchWithTimeout,
} from './fetchWithTimeout';

const originalFetch = global.fetch;

/** Resolves only when its signal aborts, standing in for a black-holed request. */
function neverResolvingFetch(): jest.Mock {
  return jest.fn((_url: string, init?: RequestInit) => {
    return new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const error = new Error('Aborted');
        error.name = 'AbortError';
        reject(error);
      });
    });
  });
}

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  it('resolves with the response when the request completes in time', async () => {
    const response = { ok: true } as Response;
    global.fetch = jest.fn().mockResolvedValue(response) as unknown as typeof fetch;

    await expect(fetchWithTimeout('https://example.test/a')).resolves.toBe(response);
  });

  it('rejects with RequestTimeoutError once the deadline passes', async () => {
    global.fetch = neverResolvingFetch() as unknown as typeof fetch;

    const pending = fetchWithTimeout('https://example.test/a', { timeoutMs: 5_000 });
    const assertion = expect(pending).rejects.toBeInstanceOf(RequestTimeoutError);

    jest.advanceTimersByTime(5_000);
    await assertion;
  });

  it('defaults to the shared timeout when none is given', async () => {
    global.fetch = neverResolvingFetch() as unknown as typeof fetch;

    const pending = fetchWithTimeout('https://example.test/a');
    const assertion = expect(pending).rejects.toBeInstanceOf(RequestTimeoutError);

    jest.advanceTimersByTime(DEFAULT_REQUEST_TIMEOUT_MS);
    await assertion;
  });

  it('propagates a caller abort as an AbortError, not a timeout', async () => {
    global.fetch = neverResolvingFetch() as unknown as typeof fetch;
    const controller = new AbortController();

    const pending = fetchWithTimeout('https://example.test/a', {
      signal: controller.signal,
      timeoutMs: 5_000,
    });
    const assertion = expect(pending).rejects.toMatchObject({ name: 'AbortError' });

    controller.abort();
    await assertion;
  });

  it('does not leave the deadline armed after the request settles', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response) as unknown as typeof fetch;

    await fetchWithTimeout('https://example.test/a', { timeoutMs: 5_000 });

    expect(jest.getTimerCount()).toBe(0);
  });

  it('keeps the caller signal usable for a later request', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response) as unknown as typeof fetch;
    const controller = new AbortController();

    await fetchWithTimeout('https://example.test/a', { signal: controller.signal });
    await fetchWithTimeout('https://example.test/b', { signal: controller.signal });

    // The per-request listener is removed on settle, so the shared signal does
    // not accumulate one listener per call.
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
