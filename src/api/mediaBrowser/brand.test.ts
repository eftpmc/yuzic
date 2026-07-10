import { JELLYFIN_BRAND, EMBY_BRAND, buildCover, buildCoverWithTag, buildSongCover } from './brand';

describe('buildCover', () => {
  it('returns none when itemId is missing, for either brand', () => {
    expect(buildCover(JELLYFIN_BRAND, undefined)).toEqual({ kind: 'none' });
    expect(buildCover(EMBY_BRAND, undefined)).toEqual({ kind: 'none' });
  });

  it('addresses jellyfin covers by itemId alone', () => {
    expect(buildCover(JELLYFIN_BRAND, 'item-1')).toEqual({ kind: 'jellyfin', itemId: 'item-1' });
  });

  it('addresses emby covers by itemId alone, without requiring a tag', () => {
    expect(buildCover(EMBY_BRAND, 'item-1')).toEqual({ kind: 'emby', itemId: 'item-1' });
  });
});

describe('buildCoverWithTag', () => {
  it('ignores the tag for jellyfin — itemId alone is enough', () => {
    expect(buildCoverWithTag(JELLYFIN_BRAND, 'item-1', undefined)).toEqual({ kind: 'jellyfin', itemId: 'item-1' });
    expect(buildCoverWithTag(JELLYFIN_BRAND, undefined, 'tag-1')).toEqual({ kind: 'none' });
  });

  it('requires both itemId and tag for emby, else falls back to none', () => {
    expect(buildCoverWithTag(EMBY_BRAND, 'item-1', 'tag-1')).toEqual({ kind: 'emby', itemId: 'item-1', tag: 'tag-1' });
    expect(buildCoverWithTag(EMBY_BRAND, 'item-1', undefined)).toEqual({ kind: 'none' });
    expect(buildCoverWithTag(EMBY_BRAND, undefined, 'tag-1')).toEqual({ kind: 'none' });
  });
});

describe('buildSongCover', () => {
  it('addresses jellyfin song covers by the song\'s own itemId', () => {
    expect(buildSongCover(JELLYFIN_BRAND, 'song-1', 'album-1', 'tag-1')).toEqual({ kind: 'jellyfin', itemId: 'song-1' });
    expect(buildSongCover(JELLYFIN_BRAND, undefined, 'album-1', 'tag-1')).toEqual({ kind: 'none' });
  });

  it('addresses emby song covers via the parent album id + tag, ignoring the song id', () => {
    expect(buildSongCover(EMBY_BRAND, 'song-1', 'album-1', 'tag-1')).toEqual({ kind: 'emby', itemId: 'album-1', tag: 'tag-1' });
    expect(buildSongCover(EMBY_BRAND, 'song-1', 'album-1', undefined)).toEqual({ kind: 'none' });
    expect(buildSongCover(EMBY_BRAND, 'song-1', undefined, 'tag-1')).toEqual({ kind: 'none' });
  });
});
