import { getSimilarSongs } from './navidrome/similar/getSimilarSongs';
import { getSimilarArtists } from './navidrome/similar/getSimilarArtists';
import { getTopSongs } from './navidrome/artists/getTopSongs';
import { getInternetRadioStations } from './navidrome/radio/getInternetRadioStations';
import { getRandomSongs } from './navidrome/discovery/random';
import type { NavidromeClient } from './navidrome/client';

/**
 * A request that failed is not a library that is empty.
 *
 * These fetchers used to `catch` and return `[]` or `null`, which reads as a
 * successful load of nothing. That is not only a wrong message on screen — it
 * silently disables three mechanisms in `src/app/_layout.tsx` that all key off
 * a query *throwing*:
 *
 *   - `isLikelyNetworkError(error)` → `setServerUnreachable(true)`, which is
 *     the whole server-unreachable banner
 *   - the `libraryLoadFailed` toast
 *   - `retry: 1` in the query defaults
 *
 * A resolved empty array is recorded by React Query as a success, so none of
 * the three fire: no banner, no toast, and no retry on a blip that would have
 * cleared on the second attempt.
 *
 * The same shape as the engine's stalled-read bug, one layer up: a failure
 * relabelled as a plausible success before anything above can see it.
 *
 * Genuinely-absent data is a different thing and is deliberately not covered
 * here — a server with no radio stations still answers, and those paths return
 * empty from a *successful* response rather than from a catch.
 */
describe('a failed request rejects rather than resolving empty', () => {
  const failing = {
    request: jest.fn().mockRejectedValue(new Error('Network request failed')),
  } as unknown as NavidromeClient;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getSimilarSongs rejects', async () => {
    await expect(getSimilarSongs(failing, 'song-1')).rejects.toThrow('Network request failed');
  });

  it('getSimilarArtists rejects', async () => {
    await expect(getSimilarArtists(failing, 'artist-1')).rejects.toThrow('Network request failed');
  });

  it('getTopSongs rejects', async () => {
    await expect(getTopSongs(failing, 'Artist Name')).rejects.toThrow('Network request failed');
  });

  it('getInternetRadioStations rejects', async () => {
    await expect(getInternetRadioStations(failing)).rejects.toThrow('Network request failed');
  });

  it('getRandomSongs rejects', async () => {
    await expect(getRandomSongs(failing)).rejects.toThrow('Network request failed');
  });

  it('still logs the failure, so the reason survives the rethrow', async () => {
    await expect(getSimilarSongs(failing, 'song-1')).rejects.toThrow();
    expect(console.error).toHaveBeenCalled();
  });
});
