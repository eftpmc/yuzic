import { detectFinishedQueueItems, fetchQueue, type SlskdQueueRecord } from './index';

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
