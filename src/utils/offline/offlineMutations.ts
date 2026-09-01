import { Song } from '@/types';

export type OfflineMutationFailure = {
  retryCount?: number;
  lastError?: string;
  lastFailedAt?: number;
  nextRetryAt?: number;
};

type OfflineMutationBase = OfflineMutationFailure & {
  id: string;
  serverId: string;
  createdAt: number;
};

/** Where a scrobble is submitted. Each is queued separately: one destination
 * failing must not re-submit to the ones that already accepted the play. */
export type ScrobbleDestination = 'server' | 'listenbrainz' | 'lastfm';

export type OfflineMutation =
  | (OfflineMutationBase & {
      type: 'starSong';
      song: Song;
    })
  | (OfflineMutationBase & {
      type: 'unstarSong';
      songId: string;
    })
  | (OfflineMutationBase & {
      type: 'addSongToPlaylist';
      playlistId: string;
      song: Song;
    })
  | (OfflineMutationBase & {
      type: 'removeSongFromPlaylist';
      playlistId: string;
      songId: string;
    })
  | (OfflineMutationBase & {
      type: 'deletePlaylist';
      playlistId: string;
    })
  | (OfflineMutationBase & {
      type: 'scrobble';
      destination: ScrobbleDestination;
      songId: string;
      artist: string;
      track: string;
      /** Unix ms when playback started. A replayed scrobble keeps this, so a
       * play submitted hours late is still recorded at the time it happened. */
      startedAt: number;
      durationSeconds?: number;
      listenedSeconds?: number;
    });

/**
 * Last.fm rejects submissions older than 14 days and ListenBrainz is similarly
 * bounded, so a scrobble that has waited this long will never be accepted —
 * retrying it forever only keeps a dead entry in the queue.
 */
export const MAX_SCROBBLE_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Whether a queued mutation should be discarded instead of retried: a scrobble
 * too old to be accepted, or one bound for a service the user has since
 * disconnected.
 */
export function shouldDropMutation(
  mutation: OfflineMutation,
  now: number,
  configuredDestinations: Record<ScrobbleDestination, boolean>
): boolean {
  if (mutation.type !== 'scrobble') return false;
  if (now - mutation.startedAt > MAX_SCROBBLE_AGE_MS) return true;
  return !configuredDestinations[mutation.destination];
}

export function createOfflineMutationId(
  type: OfflineMutation['type'],
  parts: string[]
): string {
  return `${type}:${parts.join(':')}:${Date.now()}`;
}

function sameTarget(a: OfflineMutation, b: OfflineMutation): boolean {
  if (a.serverId !== b.serverId) return false;

  if (
    (a.type === 'starSong' || a.type === 'unstarSong') &&
    (b.type === 'starSong' || b.type === 'unstarSong')
  ) {
    const aSongId = a.type === 'starSong' ? a.song.id : a.songId;
    const bSongId = b.type === 'starSong' ? b.song.id : b.songId;
    return aSongId === bSongId;
  }

  if (
    (a.type === 'addSongToPlaylist' || a.type === 'removeSongFromPlaylist') &&
    (b.type === 'addSongToPlaylist' || b.type === 'removeSongFromPlaylist')
  ) {
    const aSongId = a.type === 'addSongToPlaylist' ? a.song.id : a.songId;
    const bSongId = b.type === 'addSongToPlaylist' ? b.song.id : b.songId;
    return a.playlistId === b.playlistId && aSongId === bSongId;
  }

  if (a.type === 'deletePlaylist' && b.type === 'deletePlaylist') {
    return a.playlistId === b.playlistId;
  }

  if (a.type === 'scrobble' && b.type === 'scrobble') {
    // Two plays of the same song are two separate listens, so only an exact
    // repeat of the same submission collapses — never one play over another.
    return (
      a.destination === b.destination &&
      a.songId === b.songId &&
      a.startedAt === b.startedAt
    );
  }

  return false;
}

export type ScrobbleDetails = {
  serverId: string;
  destination: ScrobbleDestination;
  songId: string;
  artist: string;
  track: string;
  /** Unix ms when playback started. */
  startedAt: number;
  durationSeconds?: number;
  listenedSeconds?: number;
};

/** Builds the queue entry for a scrobble that failed to reach its destination. */
export function buildScrobbleMutation(
  details: ScrobbleDetails,
  now: number = Date.now()
): Extract<OfflineMutation, { type: 'scrobble' }> {
  return {
    id: createOfflineMutationId('scrobble', [
      details.destination,
      details.songId,
      String(details.startedAt),
    ]),
    type: 'scrobble',
    destination: details.destination,
    serverId: details.serverId,
    createdAt: now,
    songId: details.songId,
    artist: details.artist,
    track: details.track,
    startedAt: details.startedAt,
    durationSeconds:
      details.durationSeconds && details.durationSeconds > 0
        ? details.durationSeconds
        : undefined,
    listenedSeconds: details.listenedSeconds,
  };
}

export function enqueueOfflineMutation(
  queue: OfflineMutation[],
  mutation: OfflineMutation
): OfflineMutation[] {
  return [...queue.filter(item => !sameTarget(item, mutation)), mutation];
}
