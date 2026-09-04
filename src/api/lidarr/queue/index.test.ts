import { cancelQueueItem } from './index';

const config = { serverUrl: 'http://lidarr:8686', apiKey: 'key' };
const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

describe('cancelQueueItem', () => {
  it('deletes each grouped Lidarr id with blocklist and removeFromClient on', async () => {
    const calls: { url: string; method: string }[] = [];
    global.fetch = jest.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: (init?.method ?? 'GET').toUpperCase() });
      return { ok: true, status: 204, json: async () => ({}), text: async () => '' } as Response;
    }) as unknown as typeof fetch;

    await cancelQueueItem(config, { rawIds: [11, 22] });

    // Each id gets one DELETE; queryString carries both flags so the download
    // client drops the file and Lidarr won't grab the same release again.
    expect(calls).toHaveLength(2);
    expect(calls[0].method).toBe('DELETE');
    expect(calls[0].url).toContain('/queue/11');
    expect(calls[0].url).toContain('removeFromClient=true');
    expect(calls[0].url).toContain('blocklist=true');
    expect(calls[1].url).toContain('/queue/22');
  });

  it('honours explicit removeFromClient/blocklist=false', async () => {
    const seen: string[] = [];
    global.fetch = jest.fn(async (url: string) => {
      seen.push(String(url));
      return { ok: true, status: 204, json: async () => ({}), text: async () => '' } as Response;
    }) as unknown as typeof fetch;

    await cancelQueueItem(
      config,
      { rawIds: [7] },
      { blocklist: false, removeFromClient: false }
    );

    expect(seen[0]).toContain('removeFromClient=false');
    expect(seen[0]).toContain('blocklist=false');
  });

  it('does nothing when the record has no ids', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await cancelQueueItem(config, { rawIds: [] });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('throws when every DELETE fails, so the UI can surface it', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 500,
      json: async () => ({}),
      text: async () => 'boom',
    }) as Response) as unknown as typeof fetch;

    await expect(cancelQueueItem(config, { rawIds: [1, 2] })).rejects.toBeInstanceOf(Error);
  });

  it('is content with a partial success', async () => {
    // Lidarr sometimes 500s on one entry that was already removed elsewhere;
    // treat "at least one worked" as done so the UI keeps moving.
    let call = 0;
    global.fetch = jest.fn(async () => {
      call++;
      return call === 1
        ? ({ ok: false, status: 500, text: async () => 'boom' } as Response)
        : ({ ok: true, status: 204, json: async () => ({}), text: async () => '' } as Response);
    }) as unknown as typeof fetch;

    await expect(cancelQueueItem(config, { rawIds: [1, 2] })).resolves.toBeUndefined();
  });
});
