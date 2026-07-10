import { normalizeAlbumEntry } from './getAlbumList';

describe('normalizeAlbumEntry', () => {
  it('reads the album title from the "title" field (non-ID3 getAlbumList shape)', () => {
    const album = normalizeAlbumEntry({
      id: 'album-1',
      title: 'Album One',
      artist: 'Artist One',
      artistId: 'artist-1',
      songCount: 2,
    });
    expect(album.title).toBe('Album One');
    expect(album.subtext).toBe('Album • Artist One');
  });

  it('labels a single-track album as "Single" rather than "Album"', () => {
    const album = normalizeAlbumEntry({
      id: 'album-1',
      title: 'Single One',
      artist: 'Artist One',
      songCount: 1,
    });
    expect(album.subtext).toBe('Single • Artist One');
  });

  it('falls back to sensible defaults when fields are missing', () => {
    const album = normalizeAlbumEntry({});
    expect(album.id).toBe('');
    expect(album.title).toBe('Unknown Album');
    expect(album.year).toBe(0);
    expect(album.cover).toEqual({ kind: 'none' });
  });
});
