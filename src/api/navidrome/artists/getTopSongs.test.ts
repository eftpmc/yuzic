import { getTopSongs } from './getTopSongs';
import type { NavidromeClient } from '../client';

function makeClient(topSongs: unknown): { client: NavidromeClient; request: jest.Mock } {
  const request = jest.fn().mockResolvedValue({
    'subsonic-response': { status: 'ok', topSongs },
  });
  return {
    request,
    client: {
      request,
      buildStreamUrl: (id: string) => `https://example/stream/${id}`,
      serverUrl: 'https://example',
      username: 'u',
      password: 'p',
    } as unknown as NavidromeClient,
  };
}

describe('getTopSongs', () => {
  it('asks by artist name, which is what the endpoint takes', async () => {
    const { client, request } = makeClient({ song: [] });

    await getTopSongs(client, 'Radiohead', 5);

    expect(request).toHaveBeenCalledWith('getTopSongs.view', {
      artist: 'Radiohead',
      count: 5,
    });
  });

  it('maps the ranked songs the server returns', async () => {
    const { client } = makeClient({
      song: [
        { id: 's1', title: 'First', artist: 'A', artistId: 'a1', duration: 210, albumId: 'al1' },
        { id: 's2', title: 'Second', artist: 'A', artistId: 'a1', duration: 180, albumId: 'al1' },
      ],
    });

    const songs = await getTopSongs(client, 'A');

    expect(songs.map(s => s.id)).toEqual(['s1', 's2']);
    expect(songs[0].title).toBe('First');
  });

  /**
   * The shape a server without Last.fm actually sends. demo.navidrome.org
   * answers `"topSongs": {}` for every artist — no `song` key at all — so the
   * section that reads this has to get an empty list rather than a crash, and
   * hide itself.
   */
  it('is empty when the server has no ranking to give', async () => {
    const { client } = makeClient({});
    expect(await getTopSongs(client, 'Anyone')).toEqual([]);
  });

  it('is empty rather than a request when the artist has no name', async () => {
    const { client, request } = makeClient({ song: [] });

    expect(await getTopSongs(client, '   ')).toEqual([]);
    expect(request).not.toHaveBeenCalled();
  });

  it('is empty when the server answers with something that is not a list', async () => {
    const { client } = makeClient({ song: 'nonsense' });
    expect(await getTopSongs(client, 'A')).toEqual([]);
  });
});
