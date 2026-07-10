import { getAlbumsWithSongs } from './getAlbumsWithSongs';
import { MediaBrowserClient } from '../client';
import { JELLYFIN_BRAND, EMBY_BRAND } from '../brand';

const rawAlbum = {
  Id: 'album-1',
  Name: 'Album One',
  ArtistItems: [{ Id: 'artist-1', Name: 'Artist One' }],
  ImageTags: { Primary: 'tag-abc' },
};

const rawSong = {
  Id: 'song-1',
  Name: 'Song One',
  AlbumId: 'album-1',
  ArtistItems: [{ Id: 'artist-1', Name: 'Artist One' }],
  RunTimeTicks: 20_000_000,
};

function makeClient(brand: typeof JELLYFIN_BRAND | typeof EMBY_BRAND): MediaBrowserClient {
  const request = jest.fn((path: string) => {
    if (path.includes('IncludeItemTypes=Audio')) return Promise.resolve({ Items: [rawSong] });
    return Promise.resolve({ Items: [rawAlbum] });
  });
  return {
    request,
    requestText: jest.fn(),
    serverUrl: 'https://server.example',
    token: 'tok',
    userId: 'user-1',
    parentId: undefined,
    buildStreamUrl: jest.fn(),
    brand,
  } as unknown as MediaBrowserClient;
}

describe('getAlbumsWithSongs', () => {
  it('includes albumTitle on songs for jellyfin', async () => {
    const albums = await getAlbumsWithSongs(makeClient(JELLYFIN_BRAND));
    expect(albums[0].songs[0].albumTitle).toBe('Album One');
  });

  it('omits albumTitle on songs for emby (matches existing emby behavior)', async () => {
    const albums = await getAlbumsWithSongs(makeClient(EMBY_BRAND));
    expect(albums[0].songs[0].albumTitle).toBeUndefined();
  });

  it('gives jellyfin the nested artist cover but gives emby none', async () => {
    const jellyfinAlbums = await getAlbumsWithSongs(makeClient(JELLYFIN_BRAND));
    expect(jellyfinAlbums[0].artist.cover).toEqual({ kind: 'jellyfin', itemId: 'artist-1' });

    const embyAlbums = await getAlbumsWithSongs(makeClient(EMBY_BRAND));
    expect(embyAlbums[0].artist.cover).toEqual({ kind: 'none' });
  });
});
