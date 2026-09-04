import type { ExternalAlbumBase } from '@/types';

import {
  albumRequestFromExternal,
  downloadAlbum,
  resolveAlbumCandidate,
  resolveArtistCandidate,
} from './index';
import type {
  LidarrAlbum,
  LidarrAlbumRequest,
} from './index';
import type { LidarrArtistLookupResult } from '../artists';

const iveCandidates: LidarrArtistLookupResult[] = [
  {
    artistName: 'IVE',
    foreignArtistId: 'a92e9703-929f-45bb-aa78-b78dfde731a4',
    disambiguation: 'Ivan Lins - Joana dos Barcos',
  },
  {
    artistName: 'Ive',
    foreignArtistId: '825c46c4-d5a1-4ed2-8411-6d949b2207cc',
    disambiguation: 'US Rapper',
  },
  {
    artistName: 'IVE',
    foreignArtistId: 'a760a4d1-1258-4833-9ed5-fa083902d907',
    disambiguation: 'German rapper',
  },
  {
    artistName: 'IVE',
    foreignArtistId: 'b2f2216a-d7a9-4ce0-8b8f-f494d9a8c196',
    disambiguation: 'South Korean girl group',
    links: [
      {
        name: 'deezer',
        url: 'https://www.deezer.com/artist/153042292',
      },
    ],
  },
];

const kanyeCandidates: LidarrArtistLookupResult[] = [
  {
    artistName: 'Kanye West Tribute Band',
    foreignArtistId: '0eb17834-1d29-47ef-a422-9dc68d73c5e4',
  },
  {
    artistName: 'Ye',
    foreignArtistId: '164f0d73-1234-4e2c-8743-d77bf2191051',
    disambiguation: 'formerly Kanye West',
    links: [
      {
        name: 'deezer',
        url: 'https://www.deezer.com/artist/230',
      },
    ],
  },
];

const request = (
  overrides: Partial<LidarrAlbumRequest> = {}
): LidarrAlbumRequest => ({
  albumTitle: 'IVE EMPATHY',
  artistName: 'IVE',
  artistDeezerId: '153042292',
  albumDeezerId: '684058471',
  releaseDate: '2025-02-03',
  releaseType: 'album',
  ...overrides,
});

describe('albumRequestFromExternal', () => {
  it('preserves stable album and artist identities from the catalog item', () => {
    const album: ExternalAlbumBase = {
      id: '684058471',
      title: 'IVE EMPATHY',
      artist: 'IVE',
      artistMbid: 'b2f2216a-d7a9-4ce0-8b8f-f494d9a8c196',
      cover: { kind: 'none' },
      subtext: 'IVE',
      releaseDate: '2025-02-03',
      releaseType: 'album',
      externalIds: {
        deezerId: '684058471',
        artistDeezerId: '153042292',
        mbid: '79fae544-f374-451d-8f3f-1012bd31c519',
        artistMbid: 'b2f2216a-d7a9-4ce0-8b8f-f494d9a8c196',
      },
    };

    expect(albumRequestFromExternal(album)).toEqual({
      albumTitle: 'IVE EMPATHY',
      artistName: 'IVE',
      albumMbid: '79fae544-f374-451d-8f3f-1012bd31c519',
      artistMbid: 'b2f2216a-d7a9-4ce0-8b8f-f494d9a8c196',
      albumDeezerId: '684058471',
      artistDeezerId: '153042292',
      releaseDate: '2025-02-03',
      releaseType: 'album',
    });
  });
});

describe('resolveArtistCandidate', () => {
  it('selects IVE by exact Deezer identity even when it is fourth', () => {
    const result = resolveArtistCandidate(iveCandidates, request());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.matchedBy).toBe('deezer');
      expect(result.artist.foreignArtistId).toBe(
        'b2f2216a-d7a9-4ce0-8b8f-f494d9a8c196'
      );
    }
  });

  it('resolves the old Kanye West name to canonical Ye by Deezer identity', () => {
    const result = resolveArtistCandidate(
      kanyeCandidates,
      request({
        albumTitle: 'JESUS IS KING',
        artistName: 'Kanye West',
        artistDeezerId: '230',
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.matchedBy).toBe('deezer');
      expect(result.artist.artistName).toBe('Ye');
      expect(result.artist.foreignArtistId).toBe(
        '164f0d73-1234-4e2c-8743-d77bf2191051'
      );
    }
  });

  it('prefers MBID and rejects a contradictory Deezer identity', () => {
    const result = resolveArtistCandidate(
      iveCandidates,
      request({
        artistMbid: 'b2f2216a-d7a9-4ce0-8b8f-f494d9a8c196',
        artistDeezerId: '230',
      })
    );

    expect(result).toEqual({
      ok: false,
      code: 'external_identity_mismatch',
    });
  });

  it('uses text only when the normalized name has one candidate', () => {
    const unique = resolveArtistCandidate(
      [kanyeCandidates[0]],
      request({
        artistName: 'Kanye West Tribute Band',
        artistDeezerId: undefined,
      })
    );
    const ambiguous = resolveArtistCandidate(
      iveCandidates,
      request({ artistDeezerId: undefined })
    );

    expect(unique.ok).toBe(true);
    if (unique.ok) expect(unique.matchedBy).toBe('name');
    expect(ambiguous).toEqual({
      ok: false,
      code: 'artist_identity_ambiguous',
    });
  });
});

describe('resolveAlbumCandidate', () => {
  const albums: LidarrAlbum[] = [
    {
      id: 10,
      title: 'JESUS IS KING',
      foreignAlbumId: 'ee26718c-2633-4278-8718-f3a45a95f20e',
      artistId: 2,
      monitored: false,
      releaseDate: '2019-10-25T00:00:00Z',
      albumType: 'Album',
    },
    {
      id: 11,
      title: 'JESUS IS KING',
      foreignAlbumId: '00000000-0000-0000-0000-000000000000',
      artistId: 2,
      monitored: false,
      releaseDate: '2024-01-01T00:00:00Z',
      albumType: 'Album',
    },
  ];

  it('selects an album by MusicBrainz release-group ID', () => {
    const result = resolveAlbumCandidate(
      albums,
      request({
        albumTitle: 'Jesus Is King',
        artistName: 'Kanye West',
        albumMbid: 'ee26718c-2633-4278-8718-f3a45a95f20e',
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.matchedBy).toBe('mbid');
      expect(result.album.id).toBe(10);
    }
  });

  it('uses release year and type only to disambiguate equal titles', () => {
    const result = resolveAlbumCandidate(
      albums,
      request({
        albumTitle: 'Jesus Is King',
        artistName: 'Kanye West',
        albumMbid: undefined,
        releaseDate: '2019-10-25',
        releaseType: 'album',
      })
    );

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.album.id).toBe(10);
  });

  it('fails closed when equal titles remain ambiguous', () => {
    const result = resolveAlbumCandidate(
      albums,
      request({
        albumTitle: 'Jesus Is King',
        artistName: 'Kanye West',
        albumMbid: undefined,
        releaseDate: undefined,
        releaseType: undefined,
      })
    );

    expect(result).toEqual({
      ok: false,
      code: 'album_identity_ambiguous',
    });
  });
});

describe('downloadAlbum', () => {
  const config = {
    serverUrl: 'https://lidarr.example',
    apiKey: 'test-key',
  };
  const resolvedArtist = {
    ...iveCandidates[3],
    artistType: 'Group',
  };
  const lidarrAlbum: LidarrAlbum = {
    id: 10,
    title: 'IVE EMPATHY',
    foreignAlbumId: '79fae544-f374-451d-8f3f-1012bd31c519',
    artistId: 20,
    monitored: false,
    releaseDate: '2025-02-03T00:00:00Z',
    albumType: 'Album',
  };

  const response = (body: unknown, status = 200) =>
    Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body,
    }) as unknown as Promise<Response>;

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('creates an unmonitored artist, monitors one album, and submits one search', async () => {
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => response([]))
      .mockImplementationOnce(() => response(iveCandidates))
      .mockImplementationOnce(() => response([]))
      .mockImplementationOnce(() => response([{ path: '/music' }]))
      .mockImplementationOnce(() => response({ id: 20 }))
      .mockImplementationOnce(() => response([lidarrAlbum]))
      .mockImplementationOnce(() =>
        response({ ...lidarrAlbum, monitored: true })
      )
      .mockImplementationOnce(() => response([]))
      .mockImplementationOnce(() => response({ id: 30 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await downloadAlbum(config, request());

    expect(result).toEqual({ success: true, status: 'submitted' });

    const calls = fetchMock.mock.calls as [string, RequestInit][];
    const artistCreate = calls.find(
      ([url, options]) =>
        url.endsWith('/artist') && options?.method === 'POST'
    );
    expect(JSON.parse(String(artistCreate?.[1].body))).toMatchObject({
      foreignArtistId: 'b2f2216a-d7a9-4ce0-8b8f-f494d9a8c196',
      monitored: false,
      addOptions: {
        searchForMissingAlbums: false,
        // Regression guard for #176 — without this, Lidarr defaults to
        // monitor:'all' and flags every album on the artist.
        monitor: 'none',
      },
    });

    const albumUpdate = calls.find(
      ([url, options]) =>
        url.endsWith('/album/10') && options?.method === 'PUT'
    );
    expect(JSON.parse(String(albumUpdate?.[1].body))).toMatchObject({
      id: 10,
      monitored: true,
    });

    const searches = calls.filter(([url, options]) => {
      if (!url.endsWith('/command') || options?.method !== 'POST') return false;
      return JSON.parse(String(options.body)).name === 'AlbumSearch';
    });
    expect(searches).toHaveLength(1);
    expect(JSON.parse(String(searches[0][1].body))).toEqual({
      name: 'AlbumSearch',
      albumIds: [10],
    });
    expect(calls.some(([, options]) => options?.method === 'DELETE')).toBe(
      false
    );
  });

  it('coalesces simultaneous requests in the same client', async () => {
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => response([]))
      .mockImplementationOnce(() => response(iveCandidates))
      .mockImplementationOnce(() => response([]))
      .mockImplementationOnce(() => response([{ path: '/music' }]))
      .mockImplementationOnce(() => response({ id: 20 }))
      .mockImplementationOnce(() => response([lidarrAlbum]))
      .mockImplementationOnce(() =>
        response({ ...lidarrAlbum, monitored: true })
      )
      .mockImplementationOnce(() => response([]))
      .mockImplementationOnce(() => response({ id: 30 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const first = downloadAlbum(config, request());
    const second = downloadAlbum(config, request());

    expect(first).toBe(second);
    await expect(Promise.all([first, second])).resolves.toEqual([
      { success: true, status: 'submitted' },
      { success: true, status: 'submitted' },
    ]);

    const commandPosts = fetchMock.mock.calls.filter(
      ([url, options]) =>
        String(url).endsWith('/command') &&
        (options as RequestInit)?.method === 'POST'
    );
    expect(commandPosts).toHaveLength(1);
  });

  it('still resolves when the mbid-scoped artist lookup is rejected', async () => {
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => response([])) // local artists
      .mockImplementationOnce(() => response(iveCandidates)) // lookup by name
      .mockImplementationOnce(() => response('bad request', 400)) // lidarr:<mbid>
      .mockImplementationOnce(() => response([])) // ensureArtist re-read
      .mockImplementationOnce(() => response([{ path: '/music' }]))
      .mockImplementationOnce(() => response({ id: 20 }))
      .mockImplementationOnce(() => response([lidarrAlbum]))
      .mockImplementationOnce(() =>
        response({ ...lidarrAlbum, monitored: true })
      )
      .mockImplementationOnce(() => response([]))
      .mockImplementationOnce(() => response({ id: 30 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await downloadAlbum(
      config,
      request({ artistMbid: 'b2f2216a-d7a9-4ce0-8b8f-f494d9a8c196' })
    );

    expect(result).toEqual({ success: true, status: 'submitted' });
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).includes('lidarr%3A'))
    ).toBe(true);
  });

  it('does not submit a duplicate search already active in Lidarr', async () => {
    const localArtist = {
      ...resolvedArtist,
      id: 20,
      monitored: false,
    };
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => response([localArtist]))
      .mockImplementationOnce(() => response([localArtist]))
      .mockImplementationOnce(() =>
        response([{ ...lidarrAlbum, monitored: true }])
      )
      .mockImplementationOnce(() =>
        response([
          {
            name: 'AlbumSearch',
            status: 'started',
            body: { albumIds: [10] },
          },
        ])
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await downloadAlbum(config, request());

    expect(result).toEqual({
      success: true,
      status: 'already_processing',
      message: 'Album request is already processing',
    });
    expect(
      fetchMock.mock.calls.some(
        ([url, options]) =>
          String(url).endsWith('/command') &&
          (options as RequestInit)?.method === 'POST'
      )
    ).toBe(false);
  });
});
