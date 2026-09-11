/* eslint-disable import/first -- Jest mocks must be registered before imports. */
const mockAccountFetch = jest.fn();
const mockServerRequest = jest.fn();

jest.mock('@/api/fetchWithTimeout', () => ({
  fetchWithTimeout: (...args: unknown[]) => mockAccountFetch(...args),
}));

jest.mock('../client', () => ({
  plexHeaders: () => ({}),
  createPlexClient: jest.fn(() => ({ request: mockServerRequest })),
}));

import { createPlexClient } from '../client';
import { pollPlexPin } from './pin';

describe('pollPlexPin', () => {
  beforeEach(() => {
    mockAccountFetch.mockReset();
    mockServerRequest.mockReset();
  });

  it('does not approve a Plex account until the selected server accepts its token', async () => {
    mockAccountFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ authToken: 'account-token' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ username: 'zack' }) });
    mockServerRequest.mockRejectedValueOnce(new Error('Plex request failed (401)'));

    await expect(pollPlexPin('pin-id', 'https://plex.example', {
      username: 'proxy-user', password: 'proxy-password',
    })).rejects.toThrow('401');

    expect(createPlexClient).toHaveBeenCalledWith({
      serverUrl: 'https://plex.example',
      token: 'account-token',
      basicAuth: { username: 'proxy-user', password: 'proxy-password' },
    });
    expect(mockServerRequest).toHaveBeenCalledWith('/library/sections');
  });
});
