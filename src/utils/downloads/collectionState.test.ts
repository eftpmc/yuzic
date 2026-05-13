import {
  areTrackIdsFullyDownloaded,
  buildDownloadedTrackIdSet,
  getFullyDownloadedAlbumIds,
  isPlaylistFullyDownloaded,
} from './collectionState';

describe('download collection state', () => {
  it('normalizes downloaded ids from current and legacy track shapes', () => {
    const ids = buildDownloadedTrackIdSet([
      { id: ' track-a ' },
      { trackId: 42 },
      { originalTrack: { id: 'track-c' } },
      { id: '' },
      {},
    ]);

    expect([...ids]).toEqual(['track-a', '42', 'track-c']);
  });

  it('requires every requested track to be downloaded', () => {
    const downloaded = new Set(['a', 'b']);

    expect(areTrackIdsFullyDownloaded(['a', 'b'], downloaded)).toBe(true);
    expect(areTrackIdsFullyDownloaded(['a', 'c'], downloaded)).toBe(false);
    expect(areTrackIdsFullyDownloaded([], downloaded)).toBe(false);
  });

  it('detects fully downloaded playlists', () => {
    expect(isPlaylistFullyDownloaded(
      { id: 'playlist-1', songs: [{ id: 'a' }, { id: 'b' }] },
      new Set(['a', 'b', 'c'])
    )).toBe(true);

    expect(isPlaylistFullyDownloaded(
      { id: 'playlist-1', songs: [{ id: 'a' }, { id: 'missing' }] },
      new Set(['a'])
    )).toBe(false);
  });

  it('detects fully downloaded albums without counting partial albums', () => {
    const albumIds = getFullyDownloadedAlbumIds(
      [
        { id: 'a1', albumId: 'album-a' },
        { id: 'a2', albumId: 'album-a' },
        { id: 'b1', albumId: 'album-b' },
        { id: 'b2', albumId: 'album-b' },
        { id: 'orphan' },
      ],
      new Set(['a1', 'a2', 'b1'])
    );

    expect([...albumIds]).toEqual(['album-a']);
  });
});
