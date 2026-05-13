import { Song } from '@/types';
import { buildTrackItem } from './buildTrackItem';

jest.mock('./buildCover', () => ({
  buildCover: () => null,
}));

const baseSong: Song = {
  id: 'song-1',
  title: 'Song',
  artist: 'Artist',
  artistId: 'artist-1',
  cover: { kind: 'none' },
  duration: '120',
  albumId: 'album-1',
  streamUrl: 'https://example.com/song.mp3',
};

describe('buildTrackItem', () => {
  it('keeps remote URLs as strings', () => {
    expect(buildTrackItem(baseSong).url).toBe('https://example.com/song.mp3');
  });

  it('passes local file URLs as uri objects for native playback', () => {
    expect(buildTrackItem({
      ...baseSong,
      streamUrl: 'file:///documents/downloads/audio/song-1.mp3',
    }).url).toEqual({ uri: 'file:///documents/downloads/audio/song-1.mp3' });
  });

  it('normalizes absolute local paths before passing them to native playback', () => {
    expect(buildTrackItem({
      ...baseSong,
      streamUrl: '/documents/downloads/audio/song-1.mp3',
    }).url).toEqual({ uri: 'file:///documents/downloads/audio/song-1.mp3' });
  });
});
