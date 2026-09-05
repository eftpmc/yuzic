/**
 * Detecting that a looping track has come back around.
 *
 * A listen is normally recorded when the player moves off a track, so a track
 * on repeat recorded exactly one play no matter how many times it went round:
 * the media item never changes, so nothing ever observed the boundary. Twenty
 * plays counted as one, which is the opposite of what a repeat means.
 *
 * There is no loop event to subscribe to, so this reads the shape of it from
 * the position tick — the track was near its end, and now it is back at the
 * start. Only consulted while the queue is actually looping the same item, so
 * ordinary playback can never trip it.
 */

/** How far back toward zero the position must land to read as a restart. */
const RESTART_WINDOW_SECONDS = 10

/**
 * How much of the track must have played before the loop for the pass to be a
 * listen worth counting. Below this the reader was scrubbing, not listening,
 * and the scrobble threshold would reject it anyway.
 */
const MIN_PASS_FRACTION = 0.5

export type LoopProbe = {
  /** True only when the same media item is set to play again — repeat-one, or
   * repeat-all over a queue of one. Any other queue advances normally. */
  isLooping: boolean
  /** Position at the previous tick, in seconds. */
  previousPosition: number
  /** Position now, in seconds. */
  currentPosition: number
  /** Track length in seconds; 0 when unknown, which disables detection. */
  duration: number
}

/**
 * True when the gap between two position samples can only be the track
 * starting over: it went backwards, it landed near zero, and it had got far
 * enough in first to have been played rather than skimmed.
 *
 * A reader who seeks back to the start by hand late in a track looks the same
 * and is counted, which is the right answer anyway — they listened to it.
 */
export function isRepeatLoop({
  isLooping,
  previousPosition,
  currentPosition,
  duration,
}: LoopProbe): boolean {
  if (!isLooping) return false
  if (duration <= 0) return false
  if (currentPosition >= previousPosition) return false
  if (currentPosition > RESTART_WINDOW_SECONDS) return false
  return previousPosition >= duration * MIN_PASS_FRACTION
}
