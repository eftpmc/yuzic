import {
  MAX_SCROBBLE_AGE_MS,
  buildScrobbleMutation,
  enqueueOfflineMutation,
  shouldDropMutation,
  type OfflineMutation,
  type ScrobbleDestination,
} from './offlineMutations';

const NOW = 1_700_000_000_000;

function scrobble(overrides: Partial<Extract<OfflineMutation, { type: 'scrobble' }>> = {}) {
  return {
    id: 'scrobble:lastfm:song-1:1',
    type: 'scrobble' as const,
    destination: 'lastfm' as ScrobbleDestination,
    serverId: 'server-1',
    createdAt: NOW,
    songId: 'song-1',
    artist: 'Radiohead',
    track: '15 Step',
    startedAt: NOW,
    ...overrides,
  };
}

const allConfigured: Record<ScrobbleDestination, boolean> = {
  server: true,
  listenbrainz: true,
  lastfm: true,
};

describe('queued scrobbles', () => {
  it('keeps two plays of the same song as separate listens', () => {
    // The whole point of queueing: replaying must not collapse repeat plays
    // into one, the way star/unstar collapses onto a single target.
    const first = scrobble({ id: 'a', startedAt: NOW });
    const second = scrobble({ id: 'b', startedAt: NOW + 300_000 });

    const queue = enqueueOfflineMutation(enqueueOfflineMutation([], first), second);

    expect(queue).toHaveLength(2);
  });

  it('keeps the same play queued once per destination', () => {
    const lastfmEntry = scrobble({ id: 'a', destination: 'lastfm' });
    const lbEntry = scrobble({ id: 'b', destination: 'listenbrainz' });

    const queue = enqueueOfflineMutation(enqueueOfflineMutation([], lastfmEntry), lbEntry);

    expect(queue).toHaveLength(2);
  });

  it('collapses an exact repeat of the same submission', () => {
    const entry = scrobble({ id: 'a' });
    const repeat = scrobble({ id: 'b' });

    const queue = enqueueOfflineMutation(enqueueOfflineMutation([], entry), repeat);

    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe('b');
  });

  it('does not collapse scrobbles across servers', () => {
    const one = scrobble({ id: 'a', serverId: 'server-1' });
    const two = scrobble({ id: 'b', serverId: 'server-2' });

    expect(enqueueOfflineMutation(enqueueOfflineMutation([], one), two)).toHaveLength(2);
  });

  it('does not collapse a scrobble against an unrelated mutation', () => {
    const star: OfflineMutation = {
      id: 'star',
      type: 'unstarSong',
      serverId: 'server-1',
      createdAt: NOW,
      songId: 'song-1',
    };

    expect(enqueueOfflineMutation([star], scrobble())).toHaveLength(2);
  });
});

describe('buildScrobbleMutation', () => {
  const details = {
    serverId: 'server-1',
    destination: 'listenbrainz' as ScrobbleDestination,
    songId: 'song-1',
    artist: 'Radiohead',
    track: '15 Step',
    startedAt: NOW,
    durationSeconds: 238,
    listenedSeconds: 200,
  };

  it('carries everything the replay needs', () => {
    expect(buildScrobbleMutation(details, NOW)).toMatchObject({
      type: 'scrobble',
      destination: 'listenbrainz',
      serverId: 'server-1',
      songId: 'song-1',
      artist: 'Radiohead',
      track: '15 Step',
      startedAt: NOW,
      durationSeconds: 238,
      listenedSeconds: 200,
      createdAt: NOW,
    });
  });

  it('preserves the original start time rather than the queue time', () => {
    // A play submitted hours late must still be recorded when it happened.
    const built = buildScrobbleMutation({ ...details, startedAt: NOW - 3_600_000 }, NOW);

    expect(built.startedAt).toBe(NOW - 3_600_000);
    expect(built.createdAt).toBe(NOW);
  });

  it('omits a duration the server would reject', () => {
    expect(buildScrobbleMutation({ ...details, durationSeconds: 0 }, NOW).durationSeconds)
      .toBeUndefined();
  });

  it('gives each destination its own queue entry', () => {
    const lb = buildScrobbleMutation({ ...details, destination: 'listenbrainz' }, NOW);
    const fm = buildScrobbleMutation({ ...details, destination: 'lastfm' }, NOW);

    expect(lb.id).not.toBe(fm.id);
    expect(enqueueOfflineMutation([lb], fm)).toHaveLength(2);
  });
});

describe('shouldDropMutation', () => {
  it('keeps a recent scrobble', () => {
    expect(shouldDropMutation(scrobble(), NOW + 60_000, allConfigured)).toBe(false);
  });

  it('drops a scrobble past the submission window', () => {
    // Last.fm rejects these outright, so retrying only keeps a dead entry.
    const stale = scrobble({ startedAt: NOW - MAX_SCROBBLE_AGE_MS - 1 });

    expect(shouldDropMutation(stale, NOW, allConfigured)).toBe(true);
  });

  it('keeps a scrobble right at the edge of the window', () => {
    const edge = scrobble({ startedAt: NOW - MAX_SCROBBLE_AGE_MS });

    expect(shouldDropMutation(edge, NOW, allConfigured)).toBe(false);
  });

  it('drops a scrobble for a service the user disconnected', () => {
    expect(
      shouldDropMutation(scrobble({ destination: 'lastfm' }), NOW, {
        ...allConfigured,
        lastfm: false,
      })
    ).toBe(true);
  });

  it('keeps a scrobble for a service that is still connected', () => {
    expect(
      shouldDropMutation(scrobble({ destination: 'listenbrainz' }), NOW, {
        ...allConfigured,
        lastfm: false,
      })
    ).toBe(false);
  });

  it('never drops a non-scrobble mutation', () => {
    const star: OfflineMutation = {
      id: 'star',
      type: 'starSong',
      serverId: 'server-1',
      createdAt: NOW,
      song: { id: 'song-1' } as any,
    };

    expect(
      shouldDropMutation(star, NOW + MAX_SCROBBLE_AGE_MS * 10, {
        server: false,
        listenbrainz: false,
        lastfm: false,
      })
    ).toBe(false);
  });
});
