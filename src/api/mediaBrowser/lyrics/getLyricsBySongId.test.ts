import { getLyricsBySongId } from './getLyricsBySongId';
import type { MediaBrowserClient } from '../client';

function makeClient(response: unknown): MediaBrowserClient {
  return {
    request: jest.fn().mockResolvedValue(response),
    brand: { kind: 'jellyfin' },
  } as unknown as MediaBrowserClient;
}

describe('getLyricsBySongId', () => {
  it('converts ticks to milliseconds on a timed list', async () => {
    const client = makeClient({
      Lyrics: [
        { Start: 0, Text: 'first' },
        { Start: 42_000_000, Text: 'second' },
      ],
    });

    const result = await getLyricsBySongId(client, 'song-1');

    expect(result).toEqual({
      provider: 'jellyfin',
      synced: true,
      lines: [
        { startMs: 0, text: 'first' },
        { startMs: 4200, text: 'second' },
      ],
    });
  });

  /** The whole point of the change: this used to return timings of NaN/0 as
   *  though the track were synced, or drop the lyrics entirely. */
  it('reads a list with no timings as unsynced rather than dropping it', async () => {
    const client = makeClient({
      Lyrics: [{ Text: 'a plain line' }, { Text: 'and another' }],
    });

    const result = await getLyricsBySongId(client, 'song-1');

    expect(result).toEqual({
      provider: 'jellyfin',
      synced: false,
      lines: [
        { startMs: 0, text: 'a plain line' },
        { startMs: 0, text: 'and another' },
      ],
    });
  });

  it('prefers SyncedLyrics, which was declared and never read', async () => {
    const client = makeClient({
      SyncedLyrics: [{ StartPositionTicks: 42_000_000, Text: 'timed' }],
      Lyrics: [{ Text: 'untimed' }],
    });

    const result = await getLyricsBySongId(client, 'song-1');

    expect(result).toEqual({
      provider: 'jellyfin',
      synced: true,
      lines: [{ startMs: 4200, text: 'timed' }],
    });
  });

  it('is null when the response carries no lines', async () => {
    expect(await getLyricsBySongId(makeClient({}), 'song-1')).toBeNull();
    expect(await getLyricsBySongId(makeClient({ Lyrics: [] }), 'song-1')).toBeNull();
  });

  it('is null when every line is blank, rather than an empty sheet', async () => {
    const client = makeClient({ Lyrics: [{ Text: '  ' }, { Text: '' }] });
    expect(await getLyricsBySongId(client, 'song-1')).toBeNull();
  });
});
