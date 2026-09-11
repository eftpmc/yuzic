import type { Server } from '@/types';

/* eslint-disable import/first -- Jest mock must be registered before the adapter import. */
const mockRequest = jest.fn();
const mockBuildStreamUrl = jest.fn((path: string) => `https://plex.example${path}`);

jest.mock('./client', () => ({
  createPlexClient: jest.fn(() => ({ request: mockRequest, buildStreamUrl: mockBuildStreamUrl, buildImageUrl: jest.fn() })),
}));

import { createPlexAdapter } from './index';

const server: Server = {
  id: 'plex',
  type: 'plex',
  serverUrl: 'https://plex.example',
  username: 'Plex',
  auth: { token: 'token' },
  isAuthenticated: true,
};

describe('Plex adapter', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockBuildStreamUrl.mockClear();
  });

  it('pings a protected resource, not public server identity', async () => {
    mockRequest.mockResolvedValue({ MediaContainer: { Directory: [] } });
    await expect(createPlexAdapter(server).auth.ping()).resolves.toBe(true);
    expect(mockRequest).toHaveBeenCalledWith('/library/sections');

    mockRequest.mockRejectedValueOnce(new Error('401'));
    await expect(createPlexAdapter(server).auth.ping()).resolves.toBe(false);
  });

  it('flattens Plex search hubs into Yuzic search results', async () => {
    mockRequest.mockResolvedValue({
      MediaContainer: {
        Hub: [{ Metadata: [{ type: 'track', ratingKey: '7', title: 'Track', grandparentTitle: 'Artist', parentRatingKey: '2', parentTitle: 'Album', Media: [{ duration: 120000, Part: [{ key: '/library/parts/7' }] }] }] }],
      },
    });

    await expect(createPlexAdapter(server).search.search('track')).resolves.toEqual({
      albums: [], artists: [], songs: [expect.objectContaining({ id: '7', title: 'Track', streamId: '/library/parts/7' })],
    });
  });
});
