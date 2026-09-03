import { getArtists } from './getArtists';
import { MediaBrowserClient } from '../client';
import { JELLYFIN_BRAND } from '../brand';

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

describe('getArtists', () => {
  it('queries /Artists with the user id (issue #181 regression guard)', async () => {
    const request = jest.fn().mockResolvedValue({ Items: [] });
    const client = makeClient({ request });
    await getArtists(client);
    const path = request.mock.calls[0][0] as string;
    expect(path.startsWith('/Artists')).toBe(true);
    expect(path).toContain('userId=user-1');
    expect(path).not.toContain('IncludeItemTypes=MusicArtist');
  });

  it('appends ParentId when the client is scoped to a library', async () => {
    const request = jest.fn().mockResolvedValue({ Items: [] });
    const client = makeClient({ request, parentId: 'lib-42' });
    await getArtists(client);
    const path = request.mock.calls[0][0] as string;
    expect(path).toContain('ParentId=lib-42');
  });

  it('maps the response into Artist records', async () => {
    const request = jest.fn().mockResolvedValue({
      Items: [
        {
          Id: 'a1',
          Name: 'Artist One',
          ImageTags: { Primary: 'img-1' },
          ProviderIds: { MusicBrainz: 'mbid-1' },
        },
        { Id: 'a2', Name: 'Artist Two' },
      ],
    });
    const artists = await getArtists(makeClient({ request }));
    expect(artists).toHaveLength(2);
    expect(artists[0]).toMatchObject({ id: 'a1', name: 'Artist One', mbid: 'mbid-1' });
    expect(artists[1].mbid).toBeNull();
  });
});
