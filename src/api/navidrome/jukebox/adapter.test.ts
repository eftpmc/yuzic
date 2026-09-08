import type { Server } from '@/types';
import { createNavidromeAdapter } from '../index';
import { createJellyfinAdapter } from '../../jellyfin';

const navidromeServer: Server = {
  id: 'nav-1',
  type: 'navidrome',
  serverUrl: 'https://music.example',
  username: 'ari',
  auth: { password: 'pw' },
  isAuthenticated: true,
};

const jellyfinServer: Server = {
  id: 'jf-1',
  type: 'jellyfin',
  serverUrl: 'https://media.example',
  username: 'ari',
  auth: { token: 'tok', userId: 'u1' },
  isAuthenticated: true,
};

/**
 * The adapter surface the output picker gates on. The client underneath is
 * covered by jukebox/index.test.ts; what matters here is that the surface
 * appears only where the protocol exists, and that the wire shape is renamed
 * at the boundary rather than leaking `position` into the app.
 */
describe('jukebox adapter surface', () => {
  it('is present on Subsonic and absent on MediaBrowser servers', () => {
    expect(createNavidromeAdapter(navidromeServer).jukebox).toBeDefined();
    expect(createJellyfinAdapter(jellyfinServer).jukebox).toBeUndefined();
  });

  it('offers exactly the transport the sink drives', () => {
    const jukebox = createNavidromeAdapter(navidromeServer).jukebox!;
    expect(Object.keys(jukebox).sort()).toEqual(
      ['clear', 'setGain', 'setPlaylist', 'skip', 'start', 'status', 'stop']
    );
  });

  it('reports the server position as seconds, under a name that says so', async () => {
    const server = { ...navidromeServer };
    const adapter = createNavidromeAdapter(server);

    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        'subsonic-response': {
          status: 'ok',
          jukeboxStatus: { currentIndex: 2, playing: true, gain: 0.4, position: 87 },
        },
      }),
      text: async () => '',
    }));
    // @ts-expect-error — test double for the global
    global.fetch = fetchMock;

    await expect(adapter.jukebox!.status()).resolves.toEqual({
      currentIndex: 2,
      playing: true,
      gain: 0.4,
      positionSeconds: 87,
    });
  });
});
