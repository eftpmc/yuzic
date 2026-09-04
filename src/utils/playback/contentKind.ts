import type { ContentKind, Song } from '@/types';

/**
 * Content-kind gates. A Song without an explicit contentKind is treated as a
 * regular song — the historical default before radio and podcasts existed —
 * so every songs-only callsite in the codebase continues to work with no
 * change.
 *
 * Kept as small helpers rather than a big `if` in each callsite: the intent
 * ("can I scrobble this?", "should I show a progress bar?") reads better than
 * the string comparison, and adding a new kind later means changing the
 * helpers, not every gate.
 */

export function getContentKind(song: Song | null | undefined): ContentKind {
  return song?.contentKind ?? 'song';
}

export function isLiveStream(song: Song | null | undefined): boolean {
  return getContentKind(song) === 'liveStream';
}

export function isPodcastEpisode(song: Song | null | undefined): boolean {
  return getContentKind(song) === 'podcastEpisode';
}

/** A live stream has no known duration — hide the progress bar, timestamps
 * and seek. Podcast episodes are finite audio; a progress bar makes sense. */
export function hasFiniteDuration(song: Song | null | undefined): boolean {
  return !isLiveStream(song);
}

/** Only regular songs and podcast episodes are scrobbleable. A live stream is
 * a continuous session, not a discrete listen. */
export function canScrobble(song: Song | null | undefined): boolean {
  return !isLiveStream(song);
}

/** Skip within the "track" — 15s jump buttons. Off for live streams. */
export function canJumpWithin(song: Song | null | undefined): boolean {
  return !isLiveStream(song);
}

/** Autoplay queue-fill from a seed. A radio station is its own infinite feed
 * and should not spawn recommendations at the end. */
export function canFillQueueFrom(song: Song | null | undefined): boolean {
  return getContentKind(song) === 'song';
}

/** A synthetic id namespace for live streams routed through the Song shape,
 * so an id collision with a real track is impossible. */
export const LIVE_STREAM_ID_PREFIX = 'radio:';
export const PODCAST_EPISODE_ID_PREFIX = 'podcast:';
