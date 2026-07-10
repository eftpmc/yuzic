import { getStarredItems } from './getStarredItems';
import { MediaBrowserClient } from '../client';
import { JELLYFIN_BRAND, EMBY_BRAND } from '../brand';

const rawSong = {
  Id: 'song-1',
  Name: 'Song One',
  ArtistItems: [{ Id: 'artist-1', Name: 'Artist One' }],
  AlbumId: 'album-1',
  AlbumPrimaryImageTag: 'tag-abc',
  RunTimeTicks: 20_000_000,
};

const rawAlbum = {
  Id: 'album-1',
  Name: 'Album One',
  ArtistItems: [{ Id: 'artist-1', Name: 'Artist One' }],
  ImageTags: { Primary: 'tag-abc' },
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

describe('getStarredItems', () => {
  it('resolves song covers via the song id for jellyfin and via album id+tag for emby', async () => {
    const jellyfinResult = await getStarredItems(makeClient(JELLYFIN_BRAND));
    expect(jellyfinResult.songs[0].cover).toEqual({ kind: 'jellyfin', itemId: 'song-1' });

    const embyResult = await getStarredItems(makeClient(EMBY_BRAND));
    expect(embyResult.songs[0].cover).toEqual({ kind: 'emby', itemId: 'album-1', tag: 'tag-abc' });
  });

  it('normalizes starred albums using the shared album normalizer', async () => {
    const result = await getStarredItems(makeClient(EMBY_BRAND));
    expect(result.albums[0].id).toBe('album-1');
    expect(result.albums[0].cover).toEqual({ kind: 'emby', itemId: 'album-1', tag: 'tag-abc' });
  });

  it('returns empty results instead of throwing when a request fails', async () => {
    const client = makeClient(JELLYFIN_BRAND);
    (client.request as jest.Mock).mockRejectedValue(new Error('network down'));
    await expect(getStarredItems(client)).resolves.toEqual({ songs: [], albums: [] });
  });
});
