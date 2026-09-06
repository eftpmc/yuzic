import type { Server } from '@/types';
import { createMediaBrowserAdapter } from './adapter';
import { JELLYFIN_BRAND, EMBY_BRAND } from './brand';
import { createJellyfinAdapter } from '../jellyfin';
import { createEmbyAdapter } from '../emby';

function serverOf(type: Server['type']): Server {
  return {
    id: `${type}-1`,
    type,
    serverUrl: 'https://media.example',
    username: 'ari',
    auth: { token: 'tok', userId: 'user-1' },
    isAuthenticated: true,
  };
}

/**
 * Jellyfin and Emby were two adapter files that differed only by a brand
 * constant, and had already begun to drift apart. They are one adapter now;
 * these check that the seam is the brand and nothing else, so the next change
 * to the shared body can't reach only one of them.
 */
describe('mediaBrowser adapter', () => {
  it('gives both brands the same surface', () => {
    const jellyfin = createJellyfinAdapter(serverOf('jellyfin'));
    const emby = createEmbyAdapter(serverOf('emby'));

    expect(Object.keys(jellyfin).sort()).toEqual(Object.keys(emby).sort());
    for (const key of Object.keys(jellyfin) as (keyof typeof jellyfin)[]) {
      expect(Object.keys(jellyfin[key] as object).sort())
        .toEqual(Object.keys(emby[key] as object).sort());
    }
  });

  it('carries the optional surfaces the two servers can back, and no others', () => {
    const adapter = createJellyfinAdapter(serverOf('jellyfin'));

    // PlaybackPositionTicks stands in for a bookmarks table.
    expect(adapter.bookmarks).toBeDefined();
    // Neither server exposes a Subsonic-style play queue, internet radio,
    // shares or podcasts — the UI presence-checks these, so declaring one we
    // can't back would put a dead row in the Library index.
    expect(adapter.queue).toBeUndefined();
    expect(adapter.radio).toBeUndefined();
    expect(adapter.shares).toBeUndefined();
    expect(adapter.podcasts).toBeUndefined();
  });

  it('puts the brand where the two servers actually differ', () => {
    const jellyfin = createMediaBrowserAdapter(serverOf('jellyfin'), JELLYFIN_BRAND);
    const emby = createMediaBrowserAdapter(serverOf('emby'), EMBY_BRAND);

    expect(jellyfin.songs.buildStreamUrl('s1', 'high')).toContain('X-Emby-Token=tok');
    expect(emby.songs.buildStreamUrl('s1', 'high')).toContain('api_key=tok');
  });

  it('declares Opus on both, so the Playback switch is offered for either', () => {
    for (const adapter of [
      createJellyfinAdapter(serverOf('jellyfin')),
      createEmbyAdapter(serverOf('emby')),
    ]) {
      expect(adapter.songs.streamableCodecs).toContain('opus');
      expect(adapter.songs.buildStreamUrl('s1', 'high', 'opus')).toContain('AudioCodec=opus');
    }
  });
});
