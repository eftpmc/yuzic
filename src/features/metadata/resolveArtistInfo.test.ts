import { resolveArtistInfo } from './resolveArtistInfo';
import type { ArtistInfoInput, ArtistInfoResult } from './resolveArtistInfo';

const artist: ArtistInfoInput = { name: 'Radiohead', mbid: 'abc-123' };

const lastfmResult: ArtistInfoResult = {
  bio: 'An English rock band.',
  tags: ['alternative', 'rock'],
  source: 'lastfm',
};

describe('resolveArtistInfo', () => {
  it('is a no-op when nothing is enabled (server view preserved)', async () => {
    const lastfmFetcher = jest.fn().mockResolvedValue(lastfmResult);

    const result = await resolveArtistInfo({
      artist,
      enabledSourcesInOrder: [],
      fetchers: { lastfm: lastfmFetcher },
    });

    expect(result).toBeNull();
    expect(lastfmFetcher).not.toHaveBeenCalled();
  });

  it('returns the first enabled source that has data', async () => {
    const lastfmFetcher = jest.fn().mockResolvedValue(lastfmResult);

    const result = await resolveArtistInfo({
      artist,
      enabledSourcesInOrder: ['lastfm'],
      fetchers: { lastfm: lastfmFetcher },
    });

    expect(result).toEqual(lastfmResult);
    expect(lastfmFetcher).toHaveBeenCalledWith(artist);
  });

  it('tries sources in the user order and stops at the first hit', async () => {
    const first = jest.fn().mockResolvedValue(lastfmResult);
    const second = jest.fn().mockResolvedValue(lastfmResult);

    const result = await resolveArtistInfo({
      artist,
      enabledSourcesInOrder: ['second', 'lastfm'] as unknown as ['lastfm'],
      fetchers: { lastfm: first, second } as unknown as { lastfm: typeof first },
    });

    expect(second).toHaveBeenCalled();
    expect(first).not.toHaveBeenCalled();
    expect(result).toEqual(lastfmResult);
  });

  it('treats an empty bio and empty tags result as a miss', async () => {
    const lastfmFetcher = jest.fn().mockResolvedValue({ bio: null, tags: [], source: 'lastfm' });

    const result = await resolveArtistInfo({
      artist,
      enabledSourcesInOrder: ['lastfm'],
      fetchers: { lastfm: lastfmFetcher },
    });

    expect(result).toBeNull();
  });

  it('returns null when every enabled source misses', async () => {
    const lastfmFetcher = jest.fn().mockResolvedValue(null);

    const result = await resolveArtistInfo({
      artist,
      enabledSourcesInOrder: ['lastfm'],
      fetchers: { lastfm: lastfmFetcher },
    });

    expect(result).toBeNull();
  });
});
