export type PlaybackErrorAction =
  | { action: 'retry'; nextLastRecoveryAttemptedId: string }
  | { action: 'escalate' };

// Decides whether a PlaybackError should trigger one URL-refresh retry or
// escalate to a user-visible failure. Keyed by song id rather than a time
// window — a wall-clock gate breaks when a failure (e.g. an unreachable
// server) takes longer than the window to surface, which makes every retry
// look like a "first" attempt and loops forever.
export function resolvePlaybackErrorAction(
  lastRecoveryAttemptedId: string | null,
  songId: string | undefined
): PlaybackErrorAction {
  if (songId && lastRecoveryAttemptedId !== songId) {
    return { action: 'retry', nextLastRecoveryAttemptedId: songId };
  }
  return { action: 'escalate' };
}
