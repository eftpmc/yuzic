import type { AlbumBase } from '@/types';
import {
  SINGLE_OR_EP_MAX_TRACKS,
  isSingleOrEp,
  isSingleOrEpTitle,
} from './releaseKind';

const album = (title: string) => ({ id: 'a', title } as AlbumBase);

describe('isSingleOrEp by track count', () => {
  it('treats a short release as a single or EP', () => {
    expect(isSingleOrEp(album('Anything'), 1)).toBe(true);
    expect(isSingleOrEp(album('Anything'), SINGLE_OR_EP_MAX_TRACKS)).toBe(true);
  });

  it('treats a full-length release as an album', () => {
    expect(isSingleOrEp(album('Anything'), SINGLE_OR_EP_MAX_TRACKS + 1)).toBe(false);
  });

  it('lets the count override the title', () => {
    // A known-long release stays an album whatever it is called.
    expect(isSingleOrEp(album('Live EP'), 20)).toBe(false);
  });
});

describe('isSingleOrEp with an unknown track count', () => {
  it('falls through to the title rather than counting zero as short', () => {
    // Zero means the library has not indexed the tracks, not that the release
    // is empty; treating it as short would file every unindexed album wrongly.
    expect(isSingleOrEp(album('OK Computer'), 0)).toBe(false);
    expect(isSingleOrEp(album('Live EP'), 0)).toBe(true);
  });
});

describe('isSingleOrEpTitle', () => {
  it.each([
    ['Live EP'],
    ['The Sleep EP'],
    ['EP'],
    ['Single'],
    ['Creep - Single'],
  ])('recognises %s', (title) => {
    expect(isSingleOrEpTitle(title)).toBe(true);
  });

  it.each([
    ['The Epic', 'a word merely starting with "ep"'],
    ['Epic Journey', 'the same at the start of the title'],
    ['Singles Collection', 'a compilation, not a single'],
    ['Deep Purple', 'an "ep" inside another word'],
    ['OK Computer', 'an ordinary album'],
    ['Amnesiac', 'another ordinary album'],
  ])('does not misread %s (%s)', (title) => {
    expect(isSingleOrEpTitle(title)).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isSingleOrEpTitle('live ep')).toBe(true);
    expect(isSingleOrEpTitle('LIVE EP')).toBe(true);
  });

  it('handles an empty title', () => {
    expect(isSingleOrEpTitle('')).toBe(false);
  });
});
