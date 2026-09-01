/**
 * Bounds an ad-hoc play queue — a whole library screen, a genre, a filter —
 * rather than an album or playlist.
 *
 * A library can hold tens of thousands of tracks and every one crosses the
 * bridge to the native player as a media item, so the queue is capped. What
 * matters is the order of operations: a shuffle samples the whole list and is
 * only then trimmed, so the cap limits queue size without limiting what a
 * shuffle can draw from.
 */

export const MAX_ADHOC_QUEUE = 500;

export type TrimmedQueue<T> = {
  songs: T[];
  index: number;
};

/**
 * Trims a queue to the cap while keeping the starting track inside it: playing
 * from track 9,000 of 10,000 must not silently start from track 1.
 */
export function trimQueueAroundIndex<T>(
  songs: T[],
  index: number,
  max: number = MAX_ADHOC_QUEUE
): TrimmedQueue<T> {
  if (songs.length <= max) return { songs, index };
  const start = Math.min(index, Math.max(0, songs.length - max));
  return { songs: songs.slice(start, start + max), index: index - start };
}

/** Clamps a requested start index onto a queue that may be shorter than it. */
export function clampStartIndex(length: number, requested: number | undefined): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(requested ?? 0, 0), length - 1);
}
