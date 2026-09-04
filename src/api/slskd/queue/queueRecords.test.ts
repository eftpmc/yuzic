import { cancelQueueItem, detectFinishedQueueItems, fetchQueue, type SlskdQueueRecord } from './index';

const config = { serverUrl: 'http://slskd:5030', apiKey: 'key' };
const originalFetch = global.fetch;

function mockTransfers(transfers: unknown) {
  return jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => transfers,
    text: async () => '',
  }) as Response);
}

afterEach(() => {
  global.fetch = originalFetch;
});

describe('fetchQueue', () => {
  it('labels a row with the artist from the path, not the peer username', async () => {
    // The row used to read "peer_42 · 2 files" because artistName was set to
    // the Soulseek username.
    global.fetch = mockTransfers([
      {
        username: 'peer_42',
        directories: [
          {
            directory: '@@abc\\Music\\Radiohead\\In Rainbows',
            files: [
              { id: '1', filename: 'a.flac', state: 'InProgress', size: 100, bytesTransferred: 50 },
              { id: '2', filename: 'b.flac', state: 'InProgress', size: 100, bytesTransferred: 0 },
            ],
          },
        ],
      },
    ]) as unknown as typeof fetch;

    const [record] = await fetchQueue(config);

    expect(record).toMatchObject({
      username: 'peer_42',
      artistName: 'Radiohead',
      title: 'In Rainbows',
      fileCount: 2,
    });
  });

  it('leaves the artist empty when the path does not reveal one', async () => {
    global.fetch = mockTransfers([
      {
        username: 'peer_42',
        directories: [
          {
            directory: '@@abc\\Downloads',
            files: [{ id: '1', filename: 'a.flac', state: 'Completed', size: 100, bytesTransferred: 100 }],
          },
        ],
      },
    ]) as unknown as typeof fetch;

    const [record] = await fetchQueue(config);

    expect(record.artistName).toBe('');
    expect(record.username).toBe('peer_42');
  });

  it('reports progress and completion across a directory', async () => {
    global.fetch = mockTransfers([
      {
        username: 'peer_42',
        directories: [
          {
            directory: '@@abc\\Radiohead - In Rainbows',
            files: [
              { id: '1', filename: 'a.flac', state: 'Completed', size: 100, bytesTransferred: 100 },
              { id: '2', filename: 'b.flac', state: 'Completed', size: 100, bytesTransferred: 100 },
            ],
          },
        ],
      },
    ]) as unknown as typeof fetch;

    const [record] = await fetchQueue(config);

    expect(record.percentComplete).toBe(100);
    expect(record.state).toBe('Completed');
  });

  it('skips directories with no files', async () => {
    global.fetch = mockTransfers([
      { username: 'peer_42', directories: [{ directory: '@@abc\\Empty', files: [] }] },
    ]) as unknown as typeof fetch;

    await expect(fetchQueue(config)).resolves.toEqual([]);
  });
});

describe('detectFinishedQueueItems', () => {
  const item = (id: string) => ({ id }) as SlskdQueueRecord;

  it('reports entries that left the queue', () => {
    expect(detectFinishedQueueItems([item('a'), item('b')], [item('b')])).toEqual([item('a')]);
  });

  it('reports nothing on the first read', () => {
    expect(detectFinishedQueueItems([], [item('a')])).toEqual([]);
  });
});

describe('cancelQueueItem', () => {
  it('cancels then removes every file in the grouping', async () => {
    const calls: { url: string; method: string }[] = [];
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: (init?.method ?? 'GET').toUpperCase() });
      return {
        ok: true,
        status: 204,
        json: async () => ({}),
        text: async () => '',
      } as Response;
    }) as unknown as typeof fetch;

    await cancelQueueItem(config, { username: 'peer 42', fileIds: ['f1', 'f2'] });

    // Each file gets a cancel (remove=false) followed by a remove (remove=true).
    // The pair is the only way slskd will let a running transfer be dropped.
    const perFile = (id: string) =>
      calls.filter((c) => c.url.includes(`/downloads/peer%2042/${id}`));
    expect(perFile('f1').map((c) => c.url)).toEqual([
      expect.stringContaining('remove=false'),
      expect.stringContaining('remove=true'),
    ]);
    expect(perFile('f2').map((c) => c.url)).toEqual([
      expect.stringContaining('remove=false'),
      expect.stringContaining('remove=true'),
    ]);
    expect(calls.every((c) => c.method === 'DELETE')).toBe(true);
  });

  it('still removes the record when cancelling a completed file 409s', async () => {
    // A finished file cannot be cancelled — that shouldn't block dropping the
    // record from the list, which is the point of pressing Cancel on it.
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('remove=false')) {
        return { ok: false, status: 409, text: async () => 'not cancellable' } as Response;
      }
      return {
        ok: true,
        status: 204,
        json: async () => ({}),
        text: async () => '',
        ...(init ? {} : {}),
      } as Response;
    }) as unknown as typeof fetch;

    await expect(
      cancelQueueItem(config, { username: 'peer_42', fileIds: ['done'] })
    ).resolves.toBeUndefined();
  });

  it('does nothing when the record has no files', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await cancelQueueItem(config, { username: 'peer_42', fileIds: [] });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
