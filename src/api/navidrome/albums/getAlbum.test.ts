import { getAlbum } from './getAlbum';
import { NavidromeClient } from '../client';
import { SubsonicResponse } from '../types';

jest.mock('../artists/getArtist', () => ({
  getArtist: jest.fn().mockResolvedValue({
    id: 'artist-1',
    name: 'Artist One',
    cover: { kind: 'none' },
    subtext: 'Artist',
    albumIds: [],
  }),
}));

jest.mock('./getAlbumInfo', () => ({
  getAlbumInfo: jest.fn().mockResolvedValue({ notes: '', musicBrainzId: null, lastFmUrl: null }),
}));

function makeClient(response: SubsonicResponse, serverId?: string): NavidromeClient {
  return {
    request: jest.fn().mockResolvedValue(response),
    buildStreamUrl: jest.fn().mockReturnValue('https://server.example/stream'),
    serverUrl: 'https://server.example',
    serverId,
    username: 'user',
    password: 'pass',
  } as unknown as NavidromeClient;
}

describe('getAlbum', () => {
  it('returns song duration as a string, not the raw Subsonic number', async () => {
    const client = makeClient({
      'subsonic-response': {
        album: {
          id: 'album-1',
          name: 'Album One',
          artistId: 'artist-1',
          song: [{ id: 'song-1', title: 'Song One', artist: 'Artist One', duration: 215 }],
        },
      },
    });

    const album = await getAlbum(client, 'album-1');
    expect(album?.songs[0].duration).toBe('215');
    expect(typeof album?.songs[0].duration).toBe('string');
  });

  it('falls back to Unknown Artist/Unknown for missing song metadata', async () => {
    const client = makeClient({
      'subsonic-response': {
        album: {
          id: 'album-1',
          name: 'Album One',
          artistId: 'artist-1',
          song: [{ id: 'song-1' }],
        },
      },
    });

    const album = await getAlbum(client, 'album-1');
    expect(album?.songs[0].artist).toBe('Unknown Artist');
    expect(album?.songs[0].title).toBe('Unknown');
  });

  it('sets a stable localId and in-library libraryState when the client carries a serverId', async () => {
    const client = makeClient(
      {
        'subsonic-response': {
          album: {
            id: 'album-1',
            name: 'Album One',
            artistId: 'artist-1',
            song: [{ id: 'song-1', title: 'Song One', artist: 'Artist One', duration: 200 }],
          },
        },
      },
      'server-1'
    );

    const album = await getAlbum(client, 'album-1');
    expect(album?.libraryState).toBe('in-library');
    expect(album?.localId).toBe('local:album:srv:server-1:album-1');
    expect(album?.artist.localId).toBe('local:artist:srv:server-1:artist-1');
    expect(album?.songs[0].localId).toBe('local:track:srv:server-1:song-1');
    expect(album?.songs[0].libraryState).toBe('in-library');

    // Stable: fetching the same album twice from the same server produces the same localId.
    const again = await getAlbum(client, 'album-1');
    expect(again?.localId).toBe(album?.localId);
  });

  it('leaves localId unset when the client has no serverId, rather than fabricating one', async () => {
    const client = makeClient({
      'subsonic-response': {
        album: {
          id: 'album-1',
          name: 'Album One',
          artistId: 'artist-1',
          song: [{ id: 'song-1', title: 'Song One', artist: 'Artist One', duration: 200 }],
        },
      },
    });

    const album = await getAlbum(client, 'album-1');
    expect(album?.localId).toBeUndefined();
    expect(album?.libraryState).toBe('in-library');
  });
});
