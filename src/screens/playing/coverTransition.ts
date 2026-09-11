import type { SwipeOutcome } from './coverSwipe';

export type CoverSlideDirection = Exclude<SwipeOutcome, 'cancel'>;
export type CoverSlidePhase = 'exiting' | 'entering';

/** A two-stage cover change: old art leaves before replacement art enters. */
export type CoverSlide = {
  direction: CoverSlideDirection;
  phase: CoverSlidePhase;
  /** The track that owns the artwork currently leaving the screen. */
  outgoingSongId: string;
};

/**
 * Keep rendering the outgoing cover until playback has actually selected its
 * replacement. The player can reject a boundary skip, and React state reaches
 * the host asynchronously, so starting the incoming animation earlier would
 * either animate the old cover back in or flash the new one at the old edge.
 */
export function enterCoverSlideWhenTrackChanges(
  slide: CoverSlide,
  currentSongId: string | undefined,
): CoverSlide {
  if (slide.phase !== 'exiting' || !currentSongId || currentSongId === slide.outgoingSongId) {
    return slide;
  }
  return { ...slide, phase: 'entering' };
}

/** The off-screen edge for either half of a directional cover transition. */
export function coverSlideOffset(
  direction: CoverSlideDirection,
  phase: CoverSlidePhase,
  width: number,
): number {
  const towardNext = direction === 'next' ? -1 : 1;
  return phase === 'exiting' ? towardNext * width : -towardNext * width;
}

/** Whether the requested direction can actually select another queue item. */
export function canStartCoverSlide(
  direction: CoverSlideDirection,
  currentIndex: number,
  queueLength: number,
  repeatMode: 'off' | 'all' | 'one',
): boolean {
  // Called from the cover pan's UI-thread callback.
  'worklet';
  if (queueLength <= 0) return false;
  if (direction === 'previous') return currentIndex > 0;
  return currentIndex < queueLength - 1 || repeatMode === 'all';
}
