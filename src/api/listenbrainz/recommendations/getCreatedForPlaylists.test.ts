import { getCreatedForPlaylists } from './getCreatedForPlaylists';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

function jspfPlaylistStub(sourcePatch: string, title: string, mbid: string) {
  return {
    playlist: {
      title,
      identifier: `https://listenbrainz.org/playlist/${mbid}`,
      extension: {
        'https://musicbrainz.org/doc/jspf#playlist': {
          additional_metadata: {
            algorithm_metadata: { source_patch: sourcePatch },
          },
        },
      },
    },
  };
}

function fullPlaylistResponse(tracks: { title: string; creator: string; identifier?: string[] }[]) {
  return {
    playlist: {
      track: tracks,
    },
  };
}

function mockFetchSequence(responses: unknown[]) {
  let call = 0;
  global.fetch = jest.fn(async () => {
    const body = responses[call] ?? responses[responses.length - 1];
    call += 1;
    return {
      ok: true,
      status: 200,
      json: async () => body,
      text: async () => '',
    } as Response;
  }) as unknown as typeof fetch;
}

describe('getCreatedForPlaylists', () => {
  it('returns [] without a username — nobody to fetch for', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const result = await getCreatedForPlaylists(undefined);
    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns [] when the createdfor list is empty', async () => {
    mockFetchSequence([{ playlists: [] }]);
    const result = await getCreatedForPlaylists('listener');
    expect(result).toEqual([]);
  });

  it('filters to the three known mix types, ignoring anything else', async () => {
    mockFetchSequence([
      {
        playlists: [
          jspfPlaylistStub('daily-jams', 'Daily Jams for listener', 'mbid-1'),
          jspfPlaylistStub('some-other-bot-mix', 'Unrelated mix', 'mbid-2'),
        ],
      },
      fullPlaylistResponse([{ title: 'Song A', creator: 'Artist A' }]),
    ]);

    const result = await getCreatedForPlaylists('listener');

    expect(result).toHaveLength(1);
    expect(result[0].mixType).toBe('daily-jams');
  });

  it('fetches tracks for each matched mix and maps them to ExternalSong', async () => {
    mockFetchSequence([
      {
        playlists: [
          jspfPlaylistStub('weekly-jams', 'Weekly Jams for listener', 'mbid-weekly'),
        ],
      },
      fullPlaylistResponse([
        {
          title: 'Track One',
          creator: 'Some Artist',
          identifier: ['https://musicbrainz.org/recording/11111111-1111-1111-1111-111111111111'],
        },
      ]),
    ]);

    const result = await getCreatedForPlaylists('listener');

    expect(result).toHaveLength(1);
    expect(result[0].tracks[0]).toMatchObject({
      title: 'Track One',
      artist: 'Some Artist',
      externalSource: 'musicbrainz',
      externalIds: { mbid: '11111111-1111-1111-1111-111111111111' },
    });
  });

  it('drops a matched mix that came back with no tracks', async () => {
    mockFetchSequence([
      {
        playlists: [
          jspfPlaylistStub('weekly-exploration', 'Weekly Exploration', 'mbid-explore'),
        ],
      },
      fullPlaylistResponse([]),
    ]);

    const result = await getCreatedForPlaylists('listener');
    expect(result).toEqual([]);
  });

  it('returns [] on a failed request rather than throwing', async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 500, json: async () => ({}), text: async () => '' })) as unknown as typeof fetch;
    const result = await getCreatedForPlaylists('listener');
    expect(result).toEqual([]);
  });

  it('returns [] when fetch itself rejects', async () => {
    global.fetch = jest.fn(async () => { throw new Error('network down'); }) as unknown as typeof fetch;
    const result = await getCreatedForPlaylists('listener');
    expect(result).toEqual([]);
  });
});
