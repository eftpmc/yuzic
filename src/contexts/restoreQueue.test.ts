import type { Song } from '@/types';

import { buildRestoredQueue } from './restoreQueue';

function song(id: string, overrides: Partial<Song> = {}): Song {
  return {
    id,
    title: `Track ${id}`,
    artist: 'Movements',
    albumId: 'album-1',
    artistId: 'artist-1',
    duration: '201',
    streamUrl: `https://server.test/stream/${id}`,
    cover: { kind: 'none' },
    ...overrides,
  } as Song;
}

/** What the app actually does: build a fresh stream URL for the song. */
const resolve = (s: Song): Song => ({ ...s, streamUrl: `https://server.test/stream/${s.id}` });

describe('buildRestoredQueue', () => {
  it('gives every restored song a playable URL', () => {
    // The library copy carries no URL — ids are all that is persisted, and the
    // library rows are metadata. Handing these on unresolved is what made a
    // restored queue unplayable: the loader asserts its input is playable,
    // threw, and the throw was swallowed by a floating promise. The app showed
    // the queue and play did nothing.
    const library = [song('a', { streamUrl: '' }), song('b', { streamUrl: '' })];

    const { queue } = buildRestoredQueue({
      persistedIds: ['a', 'b'],
      persistedIndex: 0,
      libraryTracks: library,
      resolve,
    });

    expect(queue).toHaveLength(2);
    expect(queue.every((s) => Boolean(s.streamUrl))).toBe(true);
  });

  it('drops a song it cannot make playable rather than losing the queue', () => {
    const library = [song('a', { streamUrl: '' }), song('b', { streamUrl: '' })];
    const resolveOnlyA = (s: Song): Song =>
      s.id === 'a' ? { ...s, streamUrl: 'https://server.test/stream/a' } : s;

    const { queue } = buildRestoredQueue({
      persistedIds: ['a', 'b'],
      persistedIndex: 0,
      libraryTracks: library,
      resolve: resolveOnlyA,
    });

    expect(queue.map((s) => s.id)).toEqual(['a']);
  });

  it('follows the remembered song when an earlier one has gone missing', () => {
    // 'a' is no longer in the library, so everything shifts up one. The index
    // has to follow the song, not the slot.
    const library = [song('b'), song('c')];

    const { queue, index } = buildRestoredQueue({
      persistedIds: ['a', 'b', 'c'],
      persistedIndex: 2, // 'c'
      libraryTracks: library,
      resolve,
    });

    expect(queue.map((s) => s.id)).toEqual(['b', 'c']);
    expect(queue[index].id).toBe('c');
  });

  it('falls back positionally when the remembered song is the missing one', () => {
    const library = [song('a'), song('c')];

    const { queue, index } = buildRestoredQueue({
      persistedIds: ['a', 'b', 'c'],
      persistedIndex: 1, // 'b', which is gone
      libraryTracks: library,
      resolve,
    });

    expect(queue.map((s) => s.id)).toEqual(['a', 'c']);
    expect(index).toBe(1);
  });

  it('returns nothing when the library has none of the remembered songs', () => {
    const { queue, index } = buildRestoredQueue({
      persistedIds: ['a', 'b'],
      persistedIndex: 1,
      libraryTracks: [],
      resolve,
    });

    expect(queue).toEqual([]);
    expect(index).toBe(0);
  });

  it('keeps the index inside the queue when it points past the end', () => {
    const { queue, index } = buildRestoredQueue({
      persistedIds: ['a'],
      persistedIndex: 9,
      libraryTracks: [song('a')],
      resolve,
    });

    expect(index).toBeLessThan(queue.length);
  });
});
