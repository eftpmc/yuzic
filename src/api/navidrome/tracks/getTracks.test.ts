import { getTracks } from './getTracks';
import { NavidromeClient } from '../client';
import { SubsonicResponse } from '../types';

type RequestHandler = (endpoint: string, params?: Record<string, unknown>) => SubsonicResponse;

function makeClient(handler: RequestHandler): NavidromeClient {
  return {
    request: jest.fn((endpoint: string, params?: Record<string, unknown>) =>
      Promise.resolve(handler(endpoint, params))
    ),
    buildStreamUrl: jest.fn().mockReturnValue('https://server.example/stream'),
    serverUrl: 'https://server.example',
    username: 'user',
    password: 'pass',
  } as unknown as NavidromeClient;
}

describe('getTracks', () => {
  it('returns songs from empty-query search3 when the server supports it', async () => {
    const client = makeClient((endpoint) => {
      if (endpoint === 'search3.view') {
        return {
          'subsonic-response': {
            searchResult3: {
              song: [{ id: 'song-1', title: 'Song One', artist: 'Artist One', albumId: 'album-1' }],
            },
          },
        };
      }
      throw new Error(`unexpected endpoint ${endpoint}`);
    });

    const tracks = await getTracks(client);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].id).toBe('song-1');
    expect(client.request).toHaveBeenCalledTimes(1);
  });

  it('falls back to the album list when empty-query search3 returns nothing (plain Subsonic)', async () => {
    const client = makeClient((endpoint, params) => {
      if (endpoint === 'search3.view') {
        return { 'subsonic-response': { searchResult3: {} } };
      }
      if (endpoint === 'getAlbumList.view') {
        if ((params?.offset as number) > 0) {
          return { 'subsonic-response': { albumList: { album: [] } } };
        }
        return {
          'subsonic-response': {
            albumList: { album: [{ id: 'album-1', title: 'Album One', artist: 'Artist One' }] },
          },
        };
      }
      if (endpoint === 'getAlbum.view') {
        return {
          'subsonic-response': {
            album: {
              id: 'album-1',
              name: 'Album One',
              artist: 'Artist One',
              artistId: 'artist-1',
              coverArt: 'cover-1',
              song: [
                { id: 'song-1', title: 'Song One', duration: 100 },
                { id: 'song-2', title: 'Song Two', duration: 200, artist: 'Featured Artist' },
              ],
            },
          },
        };
      }
      throw new Error(`unexpected endpoint ${endpoint}`);
    });

    const tracks = await getTracks(client);
    expect(tracks).toHaveLength(2);
    expect(tracks[0]).toMatchObject({
      id: 'song-1',
      title: 'Song One',
      artist: 'Artist One',
      artistId: 'artist-1',
      albumId: 'album-1',
      cover: { kind: 'navidrome', coverArtId: 'cover-1' },
    });
    expect(tracks[1].artist).toBe('Featured Artist');
  });

  it('falls back to the album list when search3 throws (servers rejecting empty queries)', async () => {
    const client = makeClient((endpoint) => {
      if (endpoint === 'search3.view') {
        throw new Error('missing required parameter: query');
      }
      if (endpoint === 'getAlbumList.view') {
        return {
          'subsonic-response': {
            albumList: { album: [{ id: 'album-1', title: 'Album One', artist: 'Artist One' }] },
          },
        };
      }
      if (endpoint === 'getAlbum.view') {
        return {
          'subsonic-response': {
            album: { id: 'album-1', name: 'Album One', song: [{ id: 'song-1', title: 'Song One' }] },
          },
        };
      }
      throw new Error(`unexpected endpoint ${endpoint}`);
    });

    const tracks = await getTracks(client);
    expect(tracks).toHaveLength(1);
    expect(tracks[0].id).toBe('song-1');
  });
});
