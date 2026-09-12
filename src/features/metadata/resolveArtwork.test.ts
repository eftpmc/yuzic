import { resolveArtwork } from './resolveArtwork';
import type { ArtworkLookupInput, ArtworkResult } from './resolveArtwork';

const entity: ArtworkLookupInput = { name: 'Radiohead', mbid: 'abc-123', mbidType: 'release-group' };

const deezerResult: ArtworkResult = {
  cover: { kind: 'url', url: 'https://example.com/artist.jpg' },
  source: 'deezer',
};

const cazResult: ArtworkResult = {
  cover: { kind: 'coverartarchive', mbid: 'abc-123', mbidType: 'release-group' },
  source: 'coverartarchive',
};

describe('resolveArtwork', () => {
  it('is a no-op when nothing is enabled (server view preserved)', async () => {
    const deezerFetcher = jest.fn().mockResolvedValue(deezerResult);

    const result = await resolveArtwork({
      entity,
      enabledSourcesInOrder: [],
      fetchers: { deezer: deezerFetcher },
    });

    expect(result).toBeNull();
    expect(deezerFetcher).not.toHaveBeenCalled();
  });

  it('returns the first enabled source that has artwork', async () => {
    const deezerFetcher = jest.fn().mockResolvedValue(deezerResult);

    const result = await resolveArtwork({
      entity,
      enabledSourcesInOrder: ['deezer'],
      fetchers: { deezer: deezerFetcher },
    });

    expect(result).toEqual(deezerResult);
    expect(deezerFetcher).toHaveBeenCalledWith(entity);
  });

  it('falls through to the next enabled source when the first misses', async () => {
    const deezerFetcher = jest.fn().mockResolvedValue(null);
    const cazFetcher = jest.fn().mockResolvedValue(cazResult);

    const result = await resolveArtwork({
      entity,
      enabledSourcesInOrder: ['deezer', 'coverartarchive'],
      fetchers: { deezer: deezerFetcher, coverartarchive: cazFetcher },
    });

    expect(result).toEqual(cazResult);
    expect(deezerFetcher).toHaveBeenCalled();
    expect(cazFetcher).toHaveBeenCalled();
  });

  it('honors the user order — coverartarchive first skips deezer entirely', async () => {
    const deezerFetcher = jest.fn().mockResolvedValue(deezerResult);
    const cazFetcher = jest.fn().mockResolvedValue(cazResult);

    const result = await resolveArtwork({
      entity,
      enabledSourcesInOrder: ['coverartarchive', 'deezer'],
      fetchers: { deezer: deezerFetcher, coverartarchive: cazFetcher },
    });

    expect(result).toEqual(cazResult);
    expect(cazFetcher).toHaveBeenCalled();
    expect(deezerFetcher).not.toHaveBeenCalled();
  });

  it('treats a "none" cover as a miss', async () => {
    const deezerFetcher = jest.fn().mockResolvedValue({ cover: { kind: 'none' }, source: 'deezer' });

    const result = await resolveArtwork({
      entity,
      enabledSourcesInOrder: ['deezer'],
      fetchers: { deezer: deezerFetcher },
    });

    expect(result).toBeNull();
  });

  it('returns null when every enabled source misses', async () => {
    const deezerFetcher = jest.fn().mockResolvedValue(null);
    const cazFetcher = jest.fn().mockResolvedValue(null);

    const result = await resolveArtwork({
      entity,
      enabledSourcesInOrder: ['deezer', 'coverartarchive'],
      fetchers: { deezer: deezerFetcher, coverartarchive: cazFetcher },
    });

    expect(result).toBeNull();
  });
});
