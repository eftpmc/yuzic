/**
 * What a horizontal swipe across the cover art means.
 *
 * Pure so the thresholds can be tested without a gesture, a player, or a
 * device — the same reason `contexts/searchLegs.ts` and
 * `features/theme`'s `pickAccent` are pure.
 */

/** Fraction of the cover's width a drag must cross to count as a skip. */
export const SWIPE_DISTANCE_RATIO = 0.28;

/**
 * Points per second past which a flick counts however short it was. A quick
 * flick and a slow drag are both intentional; only a slow *short* one is not.
 */
export const SWIPE_VELOCITY = 500;

export type SwipeOutcome = 'next' | 'previous' | 'cancel';

/**
 * Which way a completed swipe resolves.
 *
 * Direction is taken from the translation rather than the velocity: a drag
 * that overshoots and is pulled back finishes with velocity pointing the wrong
 * way, and the finger's net travel is what the user watched the cover do.
 * Velocity only decides *whether* it counts, never which way.
 *
 * Dragging left (negative) pulls the next cover in from the right, so it means
 * next — the same direction the queue moves.
 */
export function resolveCoverSwipe(
  translationX: number,
  velocityX: number,
  coverWidth: number,
): SwipeOutcome {
  const far = Math.abs(translationX) > coverWidth * SWIPE_DISTANCE_RATIO;
  const fast = Math.abs(velocityX) > SWIPE_VELOCITY;

  // A flick has to have gone *somewhere*: velocity alone would fire on a tap
  // that slipped a pixel, which is how a stray touch turns into a skipped
  // track.
  if (!far && !(fast && Math.abs(translationX) > 8)) return 'cancel';

  return translationX < 0 ? 'next' : 'previous';
}
