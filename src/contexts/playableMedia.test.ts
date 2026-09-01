import type { MediaItem } from '@rntp/player';

import type { Song } from '@/types';
import {
  assertPlayableSongs,
  getMediaItemId,
  getMediaItemUrl,
  getSourceKind,
  hasPlayableMediaUrl,
  hasSameQueueIds,
  mediaItemToFallbackSong,
  playableSongsOnly,
} from './playableMedia';

function song(id: string, overrides: Partial<Song> = {}): Song {
  return {
    id,
    title: `Track ${id}`,
    artist: 'Radiohead',
    albumId: 'album-1',
    artistId: 'artist-1',
    duration: '238',
    streamUrl: `https://server.test/stream/${id}`,
    cover: { kind: 'none' },
    ...overrides,
  } as Song;
}

describe('hasPlayableMediaUrl', () => {
  it.each([
    ['https://server.test/a.mp3'],
    ['http://server.test/a.mp3'],
    ['file:///var/app/a.mp3'],
    ['/var/app/a.mp3'],
  ])('accepts %s', (streamUrl) => {
    expect(hasPlayableMediaUrl(song('a', { streamUrl }))).toBe(true);
  });

  it.each([
    ['', 'an empty url'],
    ['   ', 'whitespace only'],
    ['relative/path.mp3', 'a relative path'],
    ['data:audio/mp3;base64,AAAA', 'a data uri the player cannot open'],
  ])('rejects %s (%s)', (streamUrl) => {
    expect(hasPlayableMediaUrl(song('a', { streamUrl }))).toBe(false);
  });

  it('rejects a missing url outright', () => {
    expect(hasPlayableMediaUrl(song('a', { streamUrl: undefined as any }))).toBe(false);
  });

  it('accepts a url that only needs trimming', () => {
    expect(hasPlayableMediaUrl(song('a', { streamUrl: '  https://server.test/a.mp3  ' }))).toBe(true);
  });
});

describe('assertPlayableSongs', () => {
  it('passes a queue of playable tracks', () => {
    expect(() => assertPlayableSongs([song('a'), song('b')])).not.toThrow();
  });

  it('names the offending track so the failure is diagnosable', () => {
    // An explicit play request fails loudly: silently dropping the track would
    // look like the button did nothing.
    expect(() => assertPlayableSongs([song('a'), song('bad', { streamUrl: '' })]))
      .toThrow(/bad/);
  });

  it('passes an empty queue', () => {
    expect(() => assertPlayableSongs([])).not.toThrow();
  });
});

describe('playableSongsOnly', () => {
  it('keeps the playable tracks and drops the rest', () => {
    // Unlike an explicit play, a queue fill should still play what it can.
    const songs = [song('a'), song('bad', { streamUrl: '' }), song('c')];

    expect(playableSongsOnly(songs).map(item => item.id)).toEqual(['a', 'c']);
  });
});

describe('getSourceKind', () => {
  it('reports a remote stream', () => {
    expect(getSourceKind(song('a'))).toBe('remote');
  });

  it('reports a downloaded file by its url scheme', () => {
    expect(getSourceKind(song('a', { streamUrl: 'file:///var/a.mp3' }))).toBe('file');
  });

  it('reports a downloaded file by its file path even on a remote url', () => {
    expect(getSourceKind(song('a', { filePath: '/var/a.mp3' }))).toBe('file');
  });

  it('reports nothing playable', () => {
    expect(getSourceKind(null)).toBe('none');
    expect(getSourceKind(song('a', { streamUrl: '' }))).toBe('none');
  });

  it('reports an unrecognised scheme', () => {
    expect(getSourceKind(song('a', { streamUrl: 'content://media/1' }))).toBe('unknown');
  });
});

describe('media item conversion', () => {
  it('prefers the media id over the url for identity', () => {
    expect(getMediaItemId({ mediaId: 'track-1', url: 'https://a.test/x' } as MediaItem))
      .toBe('track-1');
  });

  it('falls back to a string url when there is no media id', () => {
    expect(getMediaItemId({ url: 'https://a.test/x' } as MediaItem)).toBe('https://a.test/x');
  });

  it('reads a url given as a uri source', () => {
    expect(getMediaItemUrl({ url: { uri: 'https://a.test/x' } } as unknown as MediaItem))
      .toBe('https://a.test/x');
  });

  it('reads a plain string url', () => {
    expect(getMediaItemUrl({ url: 'https://a.test/x' } as MediaItem)).toBe('https://a.test/x');
  });

  it('yields an empty url for an unusable source', () => {
    expect(getMediaItemUrl({} as MediaItem)).toBe('');
    expect(getMediaItemUrl({ url: { uri: 42 } } as unknown as MediaItem)).toBe('');
  });

  it('rebuilds a song the app queue has lost track of', () => {
    const rebuilt = mediaItemToFallbackSong({
      mediaId: 'track-1',
      url: 'https://a.test/x',
      title: '15 Step',
      artist: 'Radiohead',
      duration: 238,
    } as MediaItem);

    expect(rebuilt).toMatchObject({
      id: 'track-1',
      title: '15 Step',
      artist: 'Radiohead',
      duration: '238',
      streamUrl: 'https://a.test/x',
    });
  });

  it('refuses to rebuild an item with no identity or no url', () => {
    expect(mediaItemToFallbackSong({ url: '' } as MediaItem)).toBeNull();
    expect(mediaItemToFallbackSong({ mediaId: 'track-1' } as MediaItem)).toBeNull();
  });

  it('tolerates an item missing its display fields', () => {
    const rebuilt = mediaItemToFallbackSong({ mediaId: 'a', url: 'https://a.test/x' } as MediaItem);

    expect(rebuilt).toMatchObject({ title: '', artist: '', duration: '0' });
  });
});

describe('hasSameQueueIds', () => {
  it('matches identical queues', () => {
    expect(hasSameQueueIds([song('a'), song('b')], [song('a'), song('b')])).toBe(true);
  });

  it('rejects a reordered queue', () => {
    expect(hasSameQueueIds([song('a'), song('b')], [song('b'), song('a')])).toBe(false);
  });

  it('rejects queues of different lengths', () => {
    expect(hasSameQueueIds([song('a')], [song('a'), song('b')])).toBe(false);
  });

  it('matches two empty queues', () => {
    expect(hasSameQueueIds([], [])).toBe(true);
  });
});
