import { resolvePlaybackErrorAction } from './playbackErrorRecovery';

describe('resolvePlaybackErrorAction', () => {
  it('retries the first failure for a track, however long it took to surface', () => {
    // Regression: the old logic gated retries on a wall-clock window since the
    // last recovery attempt, so a failure that took >3s to surface (e.g. an
    // unreachable server, not just a stale token) looked identical to a "first"
    // failure every time and retried forever. This must retry regardless of
    // how much time has passed.
    expect(resolvePlaybackErrorAction(null, 'song-1')).toEqual({
      action: 'retry',
      nextLastRecoveryAttemptedId: 'song-1',
    });
  });

  it('escalates when the same track fails again after already being retried', () => {
    expect(resolvePlaybackErrorAction('song-1', 'song-1')).toEqual({ action: 'escalate' });
  });

  it('retries a different track even if another track was recently retried', () => {
    expect(resolvePlaybackErrorAction('song-1', 'song-2')).toEqual({
      action: 'retry',
      nextLastRecoveryAttemptedId: 'song-2',
    });
  });

  it('escalates when there is no song id to key off of', () => {
    expect(resolvePlaybackErrorAction(null, undefined)).toEqual({ action: 'escalate' });
  });
});
