import { ping } from './ping';
import { MediaBrowserClient } from '../client';
import { JELLYFIN_BRAND, EMBY_BRAND } from '../brand';

function makeClient(overrides: Partial<MediaBrowserClient> = {}): MediaBrowserClient {
  return {
    request: jest.fn().mockResolvedValue({}),
    requestText: jest.fn().mockResolvedValue(''),
    serverUrl: 'https://server.example',
    token: 'tok',
    userId: 'user-1',
    parentId: undefined,
    buildStreamUrl: jest.fn(),
    brand: JELLYFIN_BRAND,
    ...overrides,
  } as MediaBrowserClient;
}

describe('ping', () => {
  it('uses request() for jellyfin (JSON ping)', async () => {
    const client = makeClient({ brand: JELLYFIN_BRAND });
    await expect(ping(client)).resolves.toBe(true);
    expect(client.request).toHaveBeenCalledWith('/System/Ping', { tokenOnly: true });
    expect(client.requestText).not.toHaveBeenCalled();
  });

  it('uses requestText() for emby (non-JSON ping)', async () => {
    const client = makeClient({ brand: EMBY_BRAND });
    await expect(ping(client)).resolves.toBe(true);
    expect(client.requestText).toHaveBeenCalledWith('/System/Ping', { tokenOnly: true });
    expect(client.request).not.toHaveBeenCalled();
  });

  it('returns false when the underlying call throws', async () => {
    const client = makeClient({
      brand: JELLYFIN_BRAND,
      request: jest.fn().mockRejectedValue(new Error('network down')),
    });
    await expect(ping(client)).resolves.toBe(false);
  });
});
