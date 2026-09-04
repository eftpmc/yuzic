import { downloadAlbum, downloadTrack } from './index';

const config = { serverUrl: 'http://slskd:5030', apiKey: 'key' };
const otherServer = { serverUrl: 'http://other:5030', apiKey: 'key' };

const originalFetch = global.fetch;

/**
 * Minimal slskd stand-in: a search completes immediately and returns one user
 * sharing the requested album.
 */
function mockSlskd(responses: unknown, onDelete?: () => void) {
  return jest.fn(async (url: string, init?: RequestInit) => {
    const json = (body: unknown) =>
      ({ ok: true, status: 200, json: async () => body, text: async () => '' }) as Response;

    if (init?.method === 'DELETE') {
      onDelete?.();
      return { ok: true, status: 204, json: async () => ({}), text: async () => '' } as Response;
    }
    if (url.endsWith('/searches')) return json({ id: 'search-1' });
    if (/\/searches\/[^/]+$/.test(url)) return json({ id: 'search-1', isComplete: true });
    if (url.endsWith('/responses')) return json(responses);
    return json({});
  });
}

/** DELETE calls issued against /searches/<id>. */
function searchDeletes(fetchMock: jest.Mock) {
  return fetchMock.mock.calls.filter(
    ([url, init]) => (init as RequestInit)?.method === 'DELETE' && String(url).includes('/searches/')
  );
}

const sharing = [
  {
    username: 'alice',
    hasFreeUploadSlot: true,
    files: [
      {
        filename: '@@d\\Radiohead - In Rainbows\\01 - 15 Step.flac',
        size: 1,
        code: 1,
        isLocked: false,
        extension: '.flac',
      },
    ],
  },
];

describe('slskd downloads', () => {
  beforeEach(() => {
    jest.useFakeTimers({ doNotFake: ['nextTick'] });
  });

  afterEach(() => {
    jest.useRealTimers();
    global.fetch = originalFetch;
  });

  /** Search polling sleeps between reads; drain those timers. */
  async function settle<T>(promise: Promise<T>): Promise<T> {
    for (let i = 0; i < 30; i++) {
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(2_000);
    }
    return promise;
  }

  it('queues a matching release', async () => {
    const fetchMock = mockSlskd(sharing);
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      settle(downloadAlbum(config, 'In Rainbows', 'Radiohead'))
    ).resolves.toEqual({ success: true });

    const enqueued = fetchMock.mock.calls.filter(([url]) =>
      String(url).includes('/transfers/downloads/')
    );
    expect(enqueued).toHaveLength(1);
  });

  it('reports a miss instead of queueing a different release', async () => {
    global.fetch = mockSlskd([
      {
        username: 'alice',
        hasFreeUploadSlot: true,
        files: [
          {
            filename: '@@d\\Radiohead - OK Computer\\01 - Airbag.flac',
            size: 1,
            code: 1,
            isLocked: false,
            extension: '.flac',
          },
        ],
      },
    ]) as unknown as typeof fetch;

    await expect(
      settle(downloadAlbum(config, 'In Rainbows', 'Radiohead'))
    ).resolves.toMatchObject({ success: false, code: 'no_matching_release' });
  });

  it('runs one search for two concurrent requests for the same album', async () => {
    const fetchMock = mockSlskd(sharing);
    global.fetch = fetchMock as unknown as typeof fetch;

    const both = Promise.all([
      downloadAlbum(config, 'In Rainbows', 'Radiohead'),
      downloadAlbum(config, 'In Rainbows', 'Radiohead'),
    ]);

    await expect(settle(both)).resolves.toEqual([{ success: true }, { success: true }]);

    const searches = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/searches'));
    expect(searches).toHaveLength(1);
  });

  it('does not merge the same album across two slskd servers', async () => {
    const fetchMock = mockSlskd(sharing);
    global.fetch = fetchMock as unknown as typeof fetch;

    const both = Promise.all([
      downloadAlbum(config, 'In Rainbows', 'Radiohead'),
      downloadAlbum(otherServer, 'In Rainbows', 'Radiohead'),
    ]);
    await settle(both);

    const searches = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/searches'));
    expect(searches).toHaveLength(2);
  });

  it('does not merge an album request with a track request', async () => {
    const fetchMock = mockSlskd(sharing);
    global.fetch = fetchMock as unknown as typeof fetch;

    const both = Promise.all([
      downloadAlbum(config, 'In Rainbows', 'Radiohead'),
      downloadTrack(config, 'In Rainbows', 'Radiohead'),
    ]);
    await settle(both);

    const searches = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/searches'));
    expect(searches).toHaveLength(2);
  });

  it('cleans up the search it created', async () => {
    // Otherwise every download leaves an entry in the user's slskd search list.
    const fetchMock = mockSlskd(sharing);
    global.fetch = fetchMock as unknown as typeof fetch;

    await settle(downloadAlbum(config, 'In Rainbows', 'Radiohead'));

    expect(searchDeletes(fetchMock)).toHaveLength(1);
  });

  it('still succeeds when the search cleanup fails', async () => {
    const fetchMock = jest.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'DELETE' && String(url).includes('/searches/')) {
        throw new Error('cleanup failed');
      }
      const json = (body: unknown) =>
        ({ ok: true, status: 200, json: async () => body, text: async () => '' }) as Response;
      if (url.endsWith('/searches')) return json({ id: 'search-1' });
      if (/\/searches\/[^/]+$/.test(url)) return json({ id: 'search-1', isComplete: true });
      if (url.endsWith('/responses')) return json(sharing);
      return json({});
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      settle(downloadAlbum(config, 'In Rainbows', 'Radiohead'))
    ).resolves.toEqual({ success: true });
  });

  it('rejects an empty identity without touching the network', async () => {
    const fetchMock = mockSlskd(sharing);
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(downloadAlbum(config, '', 'Radiohead')).resolves.toMatchObject({
      success: false,
      code: 'missing_identity',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
