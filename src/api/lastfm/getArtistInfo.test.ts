import { getLastFmArtistInfo } from './getArtistInfo';
import { lastfmRequest } from './client';

jest.mock('./client', () => ({
  lastfmRequest: jest.fn(),
}));

const mockedLastfmRequest = lastfmRequest as jest.Mock;

describe('getLastFmArtistInfo', () => {
  beforeEach(() => {
    mockedLastfmRequest.mockReset();
  });

  it('parses bio and tags out of the artist.getinfo response', async () => {
    mockedLastfmRequest.mockResolvedValue({
      artist: {
        bio: { summary: 'An English rock band. <a href="https://last.fm/x">Read more on Last.fm</a>' },
        tags: { tag: [{ name: 'alternative' }, { name: 'rock' }] },
      },
    });

    const result = await getLastFmArtistInfo('key', 'Radiohead');

    expect(result).toEqual({ bio: 'An English rock band.', tags: ['alternative', 'rock'] });
    expect(mockedLastfmRequest).toHaveBeenCalledWith(
      { method: 'artist.getinfo', artist: 'Radiohead', autocorrect: '1' },
      { apiKey: 'key' }
    );
  });

  it('returns null with no api key', async () => {
    const result = await getLastFmArtistInfo('', 'Radiohead');
    expect(result).toBeNull();
    expect(mockedLastfmRequest).not.toHaveBeenCalled();
  });

  it('returns null with a blank artist name', async () => {
    const result = await getLastFmArtistInfo('key', '   ');
    expect(result).toBeNull();
    expect(mockedLastfmRequest).not.toHaveBeenCalled();
  });

  it('returns null when the response has neither bio nor tags', async () => {
    mockedLastfmRequest.mockResolvedValue({ artist: { bio: { summary: '' }, tags: { tag: [] } } });

    const result = await getLastFmArtistInfo('key', 'Radiohead');
    expect(result).toBeNull();
  });

  it('returns a result with tags only when bio is missing', async () => {
    mockedLastfmRequest.mockResolvedValue({ artist: { tags: { tag: [{ name: 'jazz' }] } } });

    const result = await getLastFmArtistInfo('key', 'Miles Davis');
    expect(result).toEqual({ bio: null, tags: ['jazz'] });
  });

  it('propagates errors from lastfmRequest', async () => {
    mockedLastfmRequest.mockRejectedValue(new Error('boom'));
    await expect(getLastFmArtistInfo('key', 'Radiohead')).rejects.toThrow('boom');
  });
});
