import {
  candidateUrls,
  orderedUrls,
  rememberReachable,
  forgetReachable,
  tryWithFailover,
  isNetworkError,
  _resetCache,
} from './urlFailover';

const server = {
  id: 'srv-1',
  serverUrl: 'https://home.lan',
  fallbackUrls: ['https://ts.example', 'https://backup.example'],
};

beforeEach(() => _resetCache());

describe('candidateUrls', () => {
  it('lists primary first, then fallbacks, with trailing slashes trimmed', () => {
    expect(candidateUrls({
      id: 's',
      serverUrl: 'https://a.example/',
      fallbackUrls: ['https://b.example//', 'https://c.example'],
    })).toEqual(['https://a.example', 'https://b.example', 'https://c.example']);
  });

  it('deduplicates a fallback that repeats the primary (case-insensitive)', () => {
    expect(candidateUrls({
      id: 's',
      serverUrl: 'https://home.LAN',
      fallbackUrls: ['https://home.lan/', 'https://other.example'],
    })).toEqual(['https://home.LAN', 'https://other.example']);
  });

  it('drops empty fallbacks so a blank input row does not stall failover', () => {
    expect(candidateUrls({
      id: 's',
      serverUrl: 'https://a.example',
      fallbackUrls: ['', '   ', 'https://b.example'],
    })).toEqual(['https://a.example', 'https://b.example']);
  });
});

describe('orderedUrls', () => {
  it('moves a remembered fallback to the front on the next call', () => {
    rememberReachable('srv-1', 'https://ts.example');
    expect(orderedUrls(server)).toEqual([
      'https://ts.example',
      'https://home.lan',
      'https://backup.example',
    ]);
  });

  it('ignores a remembered URL that is no longer in the server list', () => {
    rememberReachable('srv-1', 'https://gone.example');
    expect(orderedUrls(server)).toEqual([
      'https://home.lan',
      'https://ts.example',
      'https://backup.example',
    ]);
  });
});

describe('tryWithFailover', () => {
  it('short-circuits on the first URL that resolves and caches it', async () => {
    const attempt = jest.fn((url: string) => Promise.resolve(url));
    const result = await tryWithFailover(server, attempt);
    expect(result).toBe('https://home.lan');
    expect(attempt).toHaveBeenCalledTimes(1);

    const attempt2 = jest.fn((url: string) => Promise.resolve(url));
    await tryWithFailover(server, attempt2);
    // Cache from the first call means the same URL is tried first again.
    expect(attempt2).toHaveBeenNthCalledWith(1, 'https://home.lan');
  });

  it('advances past a network error and remembers whichever URL answered', async () => {
    const attempt = jest.fn((url: string) => {
      if (url === 'https://home.lan') {
        return Promise.reject(new TypeError('Network request failed'));
      }
      return Promise.resolve(url);
    });

    const first = await tryWithFailover(server, attempt);
    expect(first).toBe('https://ts.example');
    expect(attempt.mock.calls.map(c => c[0])).toEqual([
      'https://home.lan',
      'https://ts.example',
    ]);

    // Next call should hit the remembered fallback directly.
    attempt.mockClear();
    const second = await tryWithFailover(server, attempt);
    expect(second).toBe('https://ts.example');
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledWith('https://ts.example');
  });

  it('re-throws non-network errors without trying the next URL — the request itself failed', async () => {
    const authError = new Error('Yuzic API error (401): unauthorized');
    const attempt = jest.fn(() => Promise.reject(authError));
    await expect(tryWithFailover(server, attempt)).rejects.toBe(authError);
    expect(attempt).toHaveBeenCalledTimes(1);
  });

  it('throws the last network error when every URL is unreachable', async () => {
    let call = 0;
    const attempt = jest.fn(() => {
      call += 1;
      return Promise.reject(new TypeError(`Network request failed #${call}`));
    });
    await expect(tryWithFailover(server, attempt)).rejects.toThrow(
      /Network request failed #3/
    );
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it('forgetting a URL resets it to primary order', async () => {
    const attempt = jest.fn((url: string) =>
      url === 'https://home.lan'
        ? Promise.reject(new TypeError('Network request failed'))
        : Promise.resolve(url)
    );
    await tryWithFailover(server, attempt);
    forgetReachable('srv-1');
    attempt.mockClear();
    await tryWithFailover(server, attempt).catch(() => {});
    expect(attempt.mock.calls[0][0]).toBe('https://home.lan');
  });
});

describe('isNetworkError', () => {
  it.each([
    new TypeError('Network request failed'),
    new TypeError('Failed to fetch'),
    new TypeError('Load failed'),
    Object.assign(new Error('ECONNREFUSED'), { name: 'FetchError' }),
    Object.assign(new Error('timeout of 30000ms exceeded'), { name: 'AbortError' }),
  ])('recognises %p as a network error', (error) => {
    expect(isNetworkError(error)).toBe(true);
  });

  it('is false for HTTP-shaped Errors — the URL responded', () => {
    expect(isNetworkError(new Error('Yuzic API error (500): boom'))).toBe(false);
    expect(isNetworkError(new Error('Not Found'))).toBe(false);
  });

  it('is false for null / undefined', () => {
    expect(isNetworkError(null)).toBe(false);
    expect(isNetworkError(undefined)).toBe(false);
  });
});
