export type PlaybackErrorAction =
  | { action: 'retry'; nextLastRecoveryAttemptedId: string }
  | { action: 'resume'; positionSeconds: number; nextStallCount: number }
  | { action: 'escalate' };

/**
 * How far into a track counts as "this was playing", rather than "this would
 * not start". Below it, a failure is about the track — a stale URL, a format
 * the device cannot open. Above it, the track was fine and the stream was not.
 */
export const STALL_MIN_POSITION_SEC = 5;

/**
 * How many times a stalled stream is resumed in place before giving up. A
 * stall that keeps coming back is a connection that is not going to serve this
 * track, and retrying forever would loop silently.
 */
export const MAX_STALL_RESUMES = 3;

/**
 * Decide what to do about a playback error.
 *
 * Three cases, and the middle one was missing:
 *
 * - **The track never really started.** A stale Navidrome token after a JS
 *   context restart is the usual cause, so refresh every URL in the queue and
 *   try again. Keyed by song id rather than a time window — a wall-clock gate
 *   breaks when a failure takes longer than the window to surface, which makes
 *   every retry look like a "first" attempt and loops forever.
 *
 * - **The track was playing and the stream stalled.** Resume where it stopped.
 *   This used to fall into the case above: the queue's URLs were refreshed and
 *   playback restarted *from the beginning*, and when the same stall happened
 *   again the track was removed from the queue as unplayable. A lossless album
 *   over a patchy connection therefore played the same minute of a song twice
 *   and then skipped it — which is what a listener sees as the song not
 *   playing through, even though nothing is wrong with the track at all.
 *
 * - **It keeps failing.** Tell the user.
 */
export function resolvePlaybackErrorAction(
  lastRecoveryAttemptedId: string | null,
  songId: string | undefined,
  context?: {
    /** Where playback had reached when the failure arrived. */
    positionSeconds: number;
    /** Resumes already spent on this song. */
    stallCount: number;
  }
): PlaybackErrorAction {
  if (
    context &&
    context.positionSeconds >= STALL_MIN_POSITION_SEC &&
    context.stallCount < MAX_STALL_RESUMES
  ) {
    return {
      action: 'resume',
      positionSeconds: context.positionSeconds,
      nextStallCount: context.stallCount + 1,
    };
  }

  if (songId && lastRecoveryAttemptedId !== songId) {
    return { action: 'retry', nextLastRecoveryAttemptedId: songId };
  }
  return { action: 'escalate' };
}
