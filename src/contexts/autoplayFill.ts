import type { Song } from '@/types';

/**
 * When Autoplay tops the queue up, and what it asks for.
 *
 * Split out of PlayingContext because both decisions are silently wrong when
 * they misfire: too strict a trigger and the queue simply runs out mid-listen,
 * too loose and it refetches constantly; a bad exclude set fills the queue with
 * tracks already in it.
 */

/** Tracks of runway left before Autoplay fetches more. */
export const LOW_WATERMARK = 3;

/** How much recent listening is sent as context for the next batch. */
export const RECENT_CONTEXT_SIZE = 5;

/** Tracks requested per fill. */
export const FILL_BATCH_SIZE = 10;

export type FillTrigger = {
  queueLength: number;
  currentIndex: number;
  autoplayEnabled: boolean;
  /** A fill already in flight; a second would duplicate its tracks. */
  isFilling: boolean;
};

/** Playable tracks left after the current one. */
export function remainingAfterCurrent(queueLength: number, currentIndex: number): number {
  return Math.max(0, queueLength - 1 - currentIndex);
}

export function shouldFillQueue({
  queueLength,
  currentIndex,
  autoplayEnabled,
  isFilling,
}: FillTrigger): boolean {
  if (!autoplayEnabled || isFilling) return false;
  return remainingAfterCurrent(queueLength, currentIndex) <= LOW_WATERMARK;
}

export type FillRequest = {
  /** The current track and the few before it, as taste context. */
  recentSongs: Song[];
  /** Everything already queued, so a fill never re-adds what is present. */
  excludeIds: Set<string>;
  count: number;
};

export function buildFillRequest(
  queue: Song[],
  currentIndex: number,
  count: number = FILL_BATCH_SIZE
): FillRequest {
  const start = Math.max(0, currentIndex - RECENT_CONTEXT_SIZE);
  return {
    recentSongs: queue.slice(start, currentIndex + 1),
    excludeIds: new Set(queue.map(song => song.id)),
    count,
  };
}
