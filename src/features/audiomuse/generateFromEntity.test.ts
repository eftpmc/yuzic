import type { ApiAdapter } from '@/api/types';
import type { AudiomuseConfig } from '@/api/audiomuse/client';
import type { Album, Artist, Song } from '@/types';
import { generateForAlbum, generateForArtist, useCanGeneratePlaylist } from './generateFromEntity';

const mockUseSelector = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: unknown) => mockUseSelector(selector),
}));

const mockGenerateSimilarPlaylist = jest.fn();
jest.mock('./generatePlaylist', () => ({
  generateSimilarPlaylist: (...args: unknown[]) => mockGenerateSimilarPlaylist(...args),
}));

const api = {} as ApiAdapter;
const audiomuseConfig: AudiomuseConfig = { serverUrl: 'https://am.example', apiToken: 'tok' };

const song1: Song = {
  id: 's1',
  title: 'Track One',
  artist: 'Some Artist',
  artistId: 'ar1',
  cover: { kind: 'none' },
  duration: '180',
  albumId: 'al1',
  streamUrl: 'https://example.com/stream',
};

const song2: Song = { ...song1, id: 's2', title: 'Track Two' };

const album: Album = {
  id: 'al1',
  title: 'My Album',
  cover: { kind: 'none' },
  subtext: 'Some Artist',
  artist: { id: 'ar1', name: 'Some Artist', subtext: '', cover: { kind: 'none' } },
  year: 2020,
  genres: [],
  created: new Date(0),
  songs: [song1, song2],
};

const artist: Artist = {
  id: 'ar1',
  cover: { kind: 'none' },
  name: 'Some Artist',
  subtext: '',
  albumIds: ['al1'],
};

describe('generateForAlbum', () => {
  beforeEach(() => {
    mockGenerateSimilarPlaylist.mockReset();
  });

  it('derives the album first track as the seed and delegates to generateSimilarPlaylist', async () => {
    mockGenerateSimilarPlaylist.mockResolvedValue({ playlistId: 'p1', trackCount: 26 });

    const result = await generateForAlbum(api, audiomuseConfig, album, { size: 25 });

    expect(mockGenerateSimilarPlaylist).toHaveBeenCalledTimes(1);
    expect(mockGenerateSimilarPlaylist).toHaveBeenCalledWith(
      api,
      audiomuseConfig,
      song1,
      { size: 25, name: 'Similar to My Album' }
    );
    expect(result).toEqual({ playlistId: 'p1', trackCount: 26 });
  });

  it('throws instead of calling the generator when the album has no tracks', async () => {
    const emptyAlbum: Album = { ...album, songs: [] };
    await expect(generateForAlbum(api, audiomuseConfig, emptyAlbum)).rejects.toThrow();
    expect(mockGenerateSimilarPlaylist).not.toHaveBeenCalled();
  });
});

describe('generateForArtist', () => {
  beforeEach(() => {
    mockGenerateSimilarPlaylist.mockReset();
  });

  it('derives the first known song as the seed and delegates to generateSimilarPlaylist', async () => {
    mockGenerateSimilarPlaylist.mockResolvedValue({ playlistId: 'p2', trackCount: 26 });

    const result = await generateForArtist(api, audiomuseConfig, artist, [song1, song2], { size: 25 });

    expect(mockGenerateSimilarPlaylist).toHaveBeenCalledTimes(1);
    expect(mockGenerateSimilarPlaylist).toHaveBeenCalledWith(
      api,
      audiomuseConfig,
      song1,
      { size: 25, name: 'Similar to Some Artist' }
    );
    expect(result).toEqual({ playlistId: 'p2', trackCount: 26 });
  });

  it('throws instead of calling the generator when the artist has no known songs', async () => {
    await expect(generateForArtist(api, audiomuseConfig, artist, [])).rejects.toThrow();
    expect(mockGenerateSimilarPlaylist).not.toHaveBeenCalled();
  });
});

describe('useCanGeneratePlaylist', () => {
  beforeEach(() => {
    mockUseSelector.mockReset();
  });

  it('is true when AudioMuse is configured', () => {
    mockUseSelector.mockReturnValue(true);
    expect(useCanGeneratePlaylist()).toBe(true);
  });

  it('is false when AudioMuse is not configured (the gesture hides)', () => {
    mockUseSelector.mockReturnValue(false);
    expect(useCanGeneratePlaylist()).toBe(false);
  });
});
