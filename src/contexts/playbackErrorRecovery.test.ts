import { MAX_STALL_RESUMES, resolvePlaybackErrorAction } from './playbackErrorRecovery';

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

describe('a stream that stalls after playing', () => {
  it('resumes where it stopped instead of restarting the track', () => {
    // Reported: a lossless album over a patchy connection played the same
    // minute of a song twice and then skipped it. The stall was being treated
    // as "this track will not play" — URLs refreshed, playback restarted from
    // zero, and on the second stall the track removed from the queue.
    const decision = resolvePlaybackErrorAction(null, 'pulse', {
      positionSeconds: 57,
      stallCount: 0,
    });

    expect(decision).toEqual({ action: 'resume', positionSeconds: 57, nextStallCount: 1 });
  });

  it('still refreshes URLs when the track never really started', () => {
    // Below the threshold this is a track problem, not a stream problem, and
    // a stale Navidrome token is the usual cause.
    const decision = resolvePlaybackErrorAction(null, 'pulse', {
      positionSeconds: 0.4,
      stallCount: 0,
    });

    expect(decision).toEqual({ action: 'retry', nextLastRecoveryAttemptedId: 'pulse' });
  });

  it('gives up resuming once the stall keeps coming back', () => {
    const decision = resolvePlaybackErrorAction('pulse', 'pulse', {
      positionSeconds: 57,
      stallCount: MAX_STALL_RESUMES,
    });

    expect(decision.action).toBe('escalate');
  });

  it('counts resumes so a dead connection cannot loop forever', () => {
    let stallCount = 0;
    const actions: string[] = [];
    for (let i = 0; i < MAX_STALL_RESUMES + 2; i += 1) {
      const decision = resolvePlaybackErrorAction('pulse', 'pulse', {
        positionSeconds: 57,
        stallCount,
      });
      actions.push(decision.action);
      if (decision.action === 'resume') stallCount = decision.nextStallCount;
    }

    expect(actions.filter((a) => a === 'resume')).toHaveLength(MAX_STALL_RESUMES);
    expect(actions[actions.length - 1]).toBe('escalate');
  });

  it('behaves as before when no playback context is given', () => {
    expect(resolvePlaybackErrorAction(null, 'pulse')).toEqual({
      action: 'retry',
      nextLastRecoveryAttemptedId: 'pulse',
    });
    expect(resolvePlaybackErrorAction('pulse', 'pulse').action).toBe('escalate');
  });
});
