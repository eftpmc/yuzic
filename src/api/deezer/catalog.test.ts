import { deezerAlbumToExternal, deezerArtistToExternal } from './catalog';

describe('deezerArtistToExternal', () => {
  it('sets libraryState to external and a stable localId derived from the deezer id', () => {
    const artist = deezerArtistToExternal({
      id: 42,
      name: 'Some Artist',
      nb_album: 3,
    });

    expect(artist.libraryState).toBe('external');
    expect(artist.localId).toBe('local:artist:ext:deezer:42');

    // Stable: converting the same raw entity again yields the same id.
    const again = deezerArtistToExternal({ id: 42, name: 'Some Artist' });
    expect(again.localId).toBe(artist.localId);
  });
});

describe('deezerAlbumToExternal', () => {
  it('sets libraryState to external and a stable localId derived from the deezer id', () => {
    const album = deezerAlbumToExternal({
      id: 7,
      title: 'Some Album',
      artist: { id: 42, name: 'Some Artist' },
    });

    expect(album.libraryState).toBe('external');
    expect(album.localId).toBe('local:album:ext:deezer:7');
  });
});
