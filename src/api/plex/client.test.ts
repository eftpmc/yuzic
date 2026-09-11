/* eslint-disable import/first -- Jest mocks must be registered before imports. */
const mockServerFetch = jest.fn();

jest.mock('@/features/mtls/serverFetch', () => ({
  serverFetch: (...args: unknown[]) => mockServerFetch(...args),
}));

jest.mock('@/utils/installationId', () => ({
  getInstallationId: () => 'install-1',
}));

import { _resetCache } from '@/utils/servers/urlFailover';
import { createPlexClient } from './client';

beforeEach(() => {
  _resetCache();
  mockServerFetch.mockReset();
});

describe('Plex client failover', () => {
  it('uses the reachable fallback for subsequent direct-play and image URLs', async () => {
    mockServerFetch
      .mockRejectedValueOnce(new TypeError('Network request failed'))
      .mockResolvedValueOnce({ ok: true, json: async () => ({ MediaContainer: {} }) });
    const client = createPlexClient({
      serverUrl: 'https://home.example',
      serverId: 'plex-1',
      fallbackUrls: ['https://tailnet.example'],
      token: 'plex-token',
    });

    await client.request('/library/sections');

    expect(mockServerFetch.mock.calls.map(([url]) => url)).toEqual([
      'https://home.example/library/sections',
      'https://tailnet.example/library/sections',
    ]);
    expect(client.buildStreamUrl('/library/parts/1')).toContain('https://tailnet.example/library/parts/1');
    expect(client.buildImageUrl('/library/metadata/1/thumb')).toContain('https://tailnet.example/library/metadata/1/thumb');
  });
});
