import {
  buildQuery,
  detectFinishedQueueItems,
  downloadTrack,
  fetchQueue,
  cancelDownload,
  type SoulSyncQueueRecord,
} from './index';
import { SoulSyncError } from '../client';

const config = { serverUrl: 'https://soulsync.example/', apiKey: 'sk_test' };

function envelope(data: unknown, ok = true, status = 200) {
  return {
    ok,
    status,
    text: async () => JSON.stringify({ success: ok, data, error: null }),
  };
}

function errorEnvelope(code: string, message: string, status: number) {
  return {
    ok: false,
    status,
    text: async () => JSON.stringify({ success: false, data: null, error: { code, message } }),
  };
}

const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const record = (over: Partial<SoulSyncQueueRecord> = {}): SoulSyncQueueRecord => ({
  id: '1', status: 'downloading', title: 'Roygbiv', artist: 'Boards of Canada',
  album: 'Music Has the Right to Children', username: 'peer', progress: 10,
  sizeBytes: 0, error: null, ...over,
});

describe('SoulSync downloads', () => {
  beforeEach(() => { fetchMock.mockReset(); });

  it('sends the query in the shape the request pipeline matches on', async () => {
    fetchMock.mockResolvedValue(envelope({ request_id: 'req-1' }));

    await downloadTrack(config, { title: 'Roygbiv', artist: 'Boards of Canada' });

    const [url, init] = fetchMock.mock.calls[0];
    // Trailing slash on the configured URL must not double up.
    expect(url).toBe('https://soulsync.example/api/v1/request');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ query: 'Boards of Canada - Roygbiv' });
  });

  it('carries the key in a header, not the query string', async () => {
    fetchMock.mockResolvedValue(envelope({ request_id: 'req-1' }));
    await downloadTrack(config, { title: 'A', artist: 'B' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).not.toContain('api_key');
    expect(init.headers.Authorization).toBe('Bearer sk_test');
  });

  it('falls back to the bare title when there is no artist to prefix', () => {
    expect(buildQuery({ title: 'Roygbiv', artist: '' })).toBe('Roygbiv');
    expect(buildQuery({ title: ' Roygbiv ', artist: ' Boards of Canada ' }))
      .toBe('Boards of Canada - Roygbiv');
  });

  it('surfaces SoulSync\'s own error code so the message can be translated', async () => {
    fetchMock.mockResolvedValue(errorEnvelope('INVALID_KEY', 'Invalid API key.', 403));

    await expect(downloadTrack(config, { title: 'A', artist: 'B' }))
      .rejects.toMatchObject({ code: 'INVALID_KEY' });
  });

  it('names a non-JSON reply as such rather than failing to parse', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 502, text: async () => '<html>Bad Gateway</html>' });

    await expect(downloadTrack(config, { title: 'A', artist: 'B' }))
      .rejects.toBeInstanceOf(SoulSyncError);
    await expect(downloadTrack(config, { title: 'A', artist: 'B' }))
      .rejects.toMatchObject({ code: 'BAD_RESPONSE' });
  });

  it('reads the queue and drops rows with no id to address', async () => {
    fetchMock.mockResolvedValue(envelope({
      downloads: [
        { id: 'a', status: 'downloading', track_name: 'One', artist_name: 'X', album_name: 'Y', username: 'peer', progress: 42, size: 100 },
        { status: 'queued', track_name: 'No id' },
      ],
    }));

    const queue = await fetchQueue(config);
    expect(queue).toHaveLength(1);
    expect(queue[0]).toMatchObject({ id: 'a', title: 'One', artist: 'X', progress: 42, username: 'peer' });
  });

  it('treats a row that left the queue as finished', () => {
    const before = [record({ id: '1' }), record({ id: '2' })];
    const after = [record({ id: '2' })];
    expect(detectFinishedQueueItems(before, after).map(r => r.id)).toEqual(['1']);
    // Nothing is "finished" on the first read, or the watcher would kick a
    // rescan for every item already in the queue when the app opened.
    expect(detectFinishedQueueItems([], after)).toEqual([]);
  });

  it('cancels by id and peer, which is what the endpoint requires', async () => {
    fetchMock.mockResolvedValue(envelope({ message: 'Download cancelled.' }));

    await cancelDownload(config, { id: 'abc', username: 'peer' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://soulsync.example/api/v1/downloads/abc/cancel');
    expect(JSON.parse(init.body)).toEqual({ username: 'peer' });
  });
});
