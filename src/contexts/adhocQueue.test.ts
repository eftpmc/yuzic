import {
  MAX_ADHOC_QUEUE,
  clampStartIndex,
  trimQueueAroundIndex,
} from './adhocQueue';

const list = (n: number) => Array.from({ length: n }, (_, i) => i);

describe('trimQueueAroundIndex', () => {
  it('leaves a queue within the cap untouched', () => {
    const result = trimQueueAroundIndex(list(10), 3, 500);

    expect(result.songs).toHaveLength(10);
    expect(result.index).toBe(3);
  });

  it('caps an oversized queue', () => {
    expect(trimQueueAroundIndex(list(10_000), 0).songs).toHaveLength(MAX_ADHOC_QUEUE);
  });

  it('keeps the starting track inside the trimmed queue', () => {
    // Playing from track 9,000 of 10,000 must not silently start from track 1.
    const result = trimQueueAroundIndex(list(10_000), 9_000, 500);

    expect(result.songs[result.index]).toBe(9_000);
  });

  it('starts the window at the chosen track when there is room after it', () => {
    const result = trimQueueAroundIndex(list(10_000), 100, 500);

    expect(result.songs[0]).toBe(100);
    expect(result.index).toBe(0);
  });

  it('backs the window off the end rather than running past it', () => {
    // Near the end there aren't `max` tracks left, so the window shifts back
    // and the index moves with it.
    const result = trimQueueAroundIndex(list(1_000), 990, 500);

    expect(result.songs).toHaveLength(500);
    expect(result.songs[result.index]).toBe(990);
    expect(result.songs[result.songs.length - 1]).toBe(999);
  });

  it('handles a queue exactly at the cap', () => {
    const result = trimQueueAroundIndex(list(500), 499, 500);

    expect(result.songs).toHaveLength(500);
    expect(result.index).toBe(499);
  });

  it('handles an empty queue', () => {
    expect(trimQueueAroundIndex([], 0).songs).toEqual([]);
  });
});

describe('clampStartIndex', () => {
  it('keeps a valid index', () => {
    expect(clampStartIndex(10, 5)).toBe(5);
  });

  it('defaults to the first track', () => {
    expect(clampStartIndex(10, undefined)).toBe(0);
  });

  it('clamps an index past the end', () => {
    expect(clampStartIndex(10, 99)).toBe(9);
  });

  it('clamps a negative index', () => {
    expect(clampStartIndex(10, -5)).toBe(0);
  });

  it('returns zero for an empty queue rather than -1', () => {
    // -1 would index off the end of the array when the caller reads songs[index].
    expect(clampStartIndex(0, 3)).toBe(0);
  });
});
