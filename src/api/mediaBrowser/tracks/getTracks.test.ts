import { getTracks } from './getTracks';
import { MediaBrowserClient } from '../client';
import { JELLYFIN_BRAND, EMBY_BRAND } from '../brand';

function makeClient(overrides: Partial<MediaBrowserClient> = {}): MediaBrowserClient {
  return {
    request: jest.fn().mockResolvedValue({ Items: [] }),
    requestText: jest.fn(),
    serverUrl: 'https://server.example',
    token: 'tok',
    userId: 'user-1',
    parentId: undefined,
    buildStreamUrl: jest.fn(),
    brand: JELLYFIN_BRAND,
    ...overrides,
  } as MediaBrowserClient;
}

const rawTrack = {
  Id: 'song-1',
  Name: 'Song One',
  ArtistItems: [{ Id: 'artist-1', Name: 'Artist One' }],
  AlbumId: 'album-1',
  AlbumPrimaryImageTag: 'tag-abc',
  RunTimeTicks: 20_000_000,
};

describe('getTracks', () => {
  it('addresses jellyfin track covers by the song\'s own id', async () => {
    const client = makeClient({
      brand: JELLYFIN_BRAND,
      request: jest.fn().mockResolvedValue({ Items: [rawTrack] }),
    });
    const tracks = await getTracks(client);
    expect(tracks[0].cover).toEqual({ kind: 'jellyfin', itemId: 'song-1' });
  });

  it('addresses emby track covers via the album id + tag, not the song id', async () => {
    const client = makeClient({
      brand: EMBY_BRAND,
      request: jest.fn().mockResolvedValue({ Items: [rawTrack] }),
    });
    const tracks = await getTracks(client);
    expect(tracks[0].cover).toEqual({ kind: 'emby', itemId: 'album-1', tag: 'tag-abc' });
  });

  it('drops emby track covers to none when no album tag was fetched', async () => {
    const client = makeClient({
      brand: EMBY_BRAND,
      request: jest.fn().mockResolvedValue({ Items: [{ ...rawTrack, AlbumPrimaryImageTag: undefined }] }),
    });
    const tracks = await getTracks(client);
    expect(tracks[0].cover).toEqual({ kind: 'none' });
  });

  it('filters out items with no Id', async () => {
    const client = makeClient({
      request: jest.fn().mockResolvedValue({ Items: [rawTrack, { Id: undefined }] }),
    });
    const tracks = await getTracks(client);
    expect(tracks).toHaveLength(1);
  });
});
