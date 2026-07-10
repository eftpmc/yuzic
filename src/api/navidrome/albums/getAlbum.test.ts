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

function makeClient(response: SubsonicResponse): NavidromeClient {
  return {
    request: jest.fn().mockResolvedValue(response),
    buildStreamUrl: jest.fn().mockReturnValue('https://server.example/stream'),
    serverUrl: 'https://server.example',
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
});
