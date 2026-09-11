import type { Server } from '@/types';
import { createNavidromeAdapter } from './navidrome';
import { createJellyfinAdapter } from './jellyfin';
import { createEmbyAdapter } from './emby';
import { createPlexAdapter } from './plex';
import { createLocalAdapter } from './local';

function serverOf(type: Server['type']): Server {
  return {
    id: `${type}-1`,
    type,
    serverUrl: 'https://media.example',
    username: 'ari',
    auth: type === 'navidrome' ? { password: 'pw' } : { token: 'tok', userId: 'u1' },
    isAuthenticated: true,
  };
}

const adapters = {
  navidrome: () => createNavidromeAdapter(serverOf('navidrome')),
  jellyfin: () => createJellyfinAdapter(serverOf('jellyfin')),
  emby: () => createEmbyAdapter(serverOf('emby')),
  plex: () => createPlexAdapter(serverOf('plex')),
  local: () => createLocalAdapter(serverOf('local')),
};

/**
 * Settings screens read these to decide what to show. They used to ask what
 * kind of server was connected instead, which meant every new provider needed
 * an edit in each screen that cared — and meant a screen could offer a switch
 * for something the server couldn't do. Each adapter states its own answer
 * here; the screens only read.
 */
describe('adapter capability declarations', () => {
  it('says which codecs it can stream, so Playback offers Opus only where it works', () => {
    expect(adapters.navidrome().songs.streamableCodecs).toEqual(['mp3']);
    expect(adapters.jellyfin().songs.streamableCodecs).toContain('opus');
    expect(adapters.emby().songs.streamableCodecs).toContain('opus');
    // Plex direct-plays its part URI; it does not expose a codec choice.
    expect(adapters.plex().songs.streamableCodecs).toEqual([]);
    expect(adapters.local().songs.streamableCodecs).toEqual([]);
  });

  it('says what scrobbling amounts to, so the Server row is worded honestly', () => {
    // scrobble.view is a listen the server may forward onward.
    expect(adapters.navidrome().songs.scrobbleKind).toBe('scrobble');
    // PlayedItems only moves a play count.
    expect(adapters.jellyfin().songs.scrobbleKind).toBe('markPlayed');
    expect(adapters.emby().songs.scrobbleKind).toBe('markPlayed');
    expect(adapters.plex().songs.scrobbleKind).toBe('scrobble');
    expect(adapters.local().songs.scrobbleKind).toBe('scrobble');
  });

  it('announces now-playing where the provider has a remote session to update', () => {
    for (const make of [adapters.navidrome, adapters.jellyfin, adapters.emby, adapters.plex]) {
      expect(make().songs.reportNowPlaying).toBeDefined();
    }
    expect(adapters.local().songs.reportNowPlaying).toBeUndefined();
  });

  it('offers queue sync and the now-playing shelf only where the server backs them', () => {
    // Both switches live on the Server screen behind these two surfaces.
    expect(adapters.navidrome().queue).toBeDefined();
    expect(adapters.navidrome().discovery).toBeDefined();

    for (const make of [adapters.jellyfin, adapters.emby, adapters.plex, adapters.local]) {
      expect(make().queue).toBeUndefined();
      expect(make().discovery).toBeUndefined();
    }
  });
});
