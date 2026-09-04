import { matchesQueuedRelease } from './externalAlbumMatch';

const album = { title: 'In Rainbows', artist: 'Radiohead' };

describe('matchesQueuedRelease', () => {
  it('matches an exact title', () => {
    expect(matchesQueuedRelease({ title: 'In Rainbows' }, album)).toBe(true);
  });

  it('matches a queue title carrying extra release tags', () => {
    // Soulseek folder names are messy; this looseness is the point.
    expect(
      matchesQueuedRelease({ title: 'In Rainbows (2007) [FLAC]' }, album)
    ).toBe(true);
  });

  it('matches when the queue title is the shorter of the two', () => {
    expect(
      matchesQueuedRelease({ title: 'Rainbows' }, album)
    ).toBe(true);
  });

  it('ignores case and surrounding whitespace', () => {
    expect(matchesQueuedRelease({ title: '  IN RAINBOWS  ' }, album)).toBe(true);
  });

  it('does not match an unrelated release', () => {
    expect(matchesQueuedRelease({ title: 'OK Computer' }, album)).toBe(false);
  });

  describe('short titles', () => {
    it('does not let a two-letter folder match everything containing it', () => {
      // The bug this guards: a queue entry from a folder called "EP" matched
      // Sleep, Deep and Repeat alike, badging unrelated albums as downloading.
      expect(matchesQueuedRelease({ title: 'EP' }, { title: 'Sleep', artist: 'A' })).toBe(false);
      expect(matchesQueuedRelease({ title: 'EP' }, { title: 'Repeat', artist: 'A' })).toBe(false);
    });

    it('still matches a genuinely short album title exactly', () => {
      // Short titles are real, so they are matched exactly rather than dropped.
      expect(matchesQueuedRelease({ title: 'X' }, { title: 'X', artist: 'A' })).toBe(true);
      expect(matchesQueuedRelease({ title: '1989' }, { title: '1989', artist: 'A' })).toBe(true);
    });

    it('does not match a short title against a longer one', () => {
      expect(matchesQueuedRelease({ title: 'X' }, { title: 'X&Y', artist: 'A' })).toBe(false);
    });

    it('does not match an empty title', () => {
      expect(matchesQueuedRelease({ title: '' }, album)).toBe(false);
      expect(matchesQueuedRelease({ title: 'In Rainbows' }, { title: '', artist: 'A' })).toBe(false);
    });
  });

  describe('artist', () => {
    it('requires the artist to agree when the path revealed one', () => {
      // Two artists' "Greatest Hits" are not the same download.
      expect(
        matchesQueuedRelease(
          { title: 'Greatest Hits', artistName: 'Queen' },
          { title: 'Greatest Hits', artist: 'Radiohead' }
        )
      ).toBe(false);
    });

    it('matches when the artist agrees', () => {
      expect(
        matchesQueuedRelease({ title: 'In Rainbows', artistName: 'Radiohead' }, album)
      ).toBe(true);
    });

    it('falls back to the title alone when the path revealed no artist', () => {
      // Most Soulseek layouts do not name an artist; requiring one would badge
      // nothing at all.
      expect(matchesQueuedRelease({ title: 'In Rainbows', artistName: '' }, album)).toBe(true);
      expect(matchesQueuedRelease({ title: 'In Rainbows' }, album)).toBe(true);
    });

    it('tolerates an artist folder carrying extra text', () => {
      expect(
        matchesQueuedRelease(
          { title: 'In Rainbows', artistName: 'Radiohead (UK)' },
          album
        )
      ).toBe(true);
    });
  });
});
