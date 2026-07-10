import { createMediaBrowserClient } from './client';
import { JELLYFIN_BRAND, EMBY_BRAND } from './brand';

const baseConfig = {
  serverUrl: 'https://server.example/',
  token: 'tok-123',
  userId: 'user-1',
};

describe('createMediaBrowserClient', () => {
  it('strips a trailing slash from the server URL', () => {
    const client = createMediaBrowserClient(baseConfig, JELLYFIN_BRAND);
    expect(client.serverUrl).toBe('https://server.example');
  });

  it('uses the brand-specific stream token param', () => {
    const jellyfin = createMediaBrowserClient(baseConfig, JELLYFIN_BRAND);
    const emby = createMediaBrowserClient(baseConfig, EMBY_BRAND);

    expect(jellyfin.buildStreamUrl('song-1', 'high', 'mp3')).toContain('X-Emby-Token=tok-123');
    expect(emby.buildStreamUrl('song-1', 'high', 'mp3')).toContain('api_key=tok-123');
  });

  it('labels API errors with the brand name', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    }) as unknown as typeof fetch;

    const jellyfin = createMediaBrowserClient(baseConfig, JELLYFIN_BRAND);
    const emby = createMediaBrowserClient(baseConfig, EMBY_BRAND);

    await expect(jellyfin.request('/Items')).rejects.toThrow('Jellyfin API error (500): boom');
    await expect(emby.request('/Items')).rejects.toThrow('Emby API error (500): boom');
  });

  it('returns an empty object for a 204 response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: { get: () => null },
    }) as unknown as typeof fetch;

    const client = createMediaBrowserClient(baseConfig, JELLYFIN_BRAND);
    await expect(client.request('/Items')).resolves.toEqual({});
  });
});
