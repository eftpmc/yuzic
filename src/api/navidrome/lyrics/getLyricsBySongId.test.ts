import { getLyricsBySongId } from './getLyricsBySongId';
import type { NavidromeClient } from '../client';

function makeClient(lyricsList: unknown): NavidromeClient {
  return {
    request: jest.fn().mockResolvedValue({ 'subsonic-response': { status: 'ok', lyricsList } }),
    buildStreamUrl: jest.fn(),
    serverUrl: 'https://example',
    username: 'u',
    password: 'p',
  } as unknown as NavidromeClient;
}

describe('getLyricsBySongId', () => {
  it('keeps the timings of a synced list', async () => {
    const client = makeClient({
      structuredLyrics: [
        { synced: true, line: [{ start: 0, value: 'first' }, { start: 4200, value: 'second' }] },
      ],
    });

    const result = await getLyricsBySongId(client, 'song-1');

    expect(result).toEqual({
      provider: 'navidrome',
      synced: true,
      lines: [
        { startMs: 0, text: 'first' },
        { startMs: 4200, text: 'second' },
      ],
    });
  });

  /** The whole point of the change: this used to return null. */
  it('returns an unsynced list instead of dropping it', async () => {
    const client = makeClient({
      structuredLyrics: [
        { synced: false, line: [{ value: 'a plain line' }, { value: 'and another' }] },
      ],
    });

    const result = await getLyricsBySongId(client, 'song-1');

    expect(result).toEqual({
      provider: 'navidrome',
      synced: false,
      lines: [
        { startMs: 0, text: 'a plain line' },
        { startMs: 0, text: 'and another' },
      ],
    });
  });

  it('zeroes an unsynced line that still carries a start value', async () => {
    const client = makeClient({
      structuredLyrics: [{ synced: false, line: [{ start: 999, value: 'untimed' }] }],
    });

    const result = await getLyricsBySongId(client, 'song-1');

    expect(result?.lines).toEqual([{ startMs: 0, text: 'untimed' }]);
  });

  it('is null when there are no lyrics at all', async () => {
    expect(await getLyricsBySongId(makeClient({}), 'song-1')).toBeNull();
    expect(await getLyricsBySongId(makeClient({ structuredLyrics: [] }), 'song-1')).toBeNull();
  });

  it('is null when every line is blank, rather than an empty sheet', async () => {
    const client = makeClient({
      structuredLyrics: [{ synced: false, line: [{ value: '   ' }, { value: '' }] }],
    });

    expect(await getLyricsBySongId(client, 'song-1')).toBeNull();
  });
});
