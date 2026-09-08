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

/** A 30s external clip — Deezer preview etc. Duration is known but the URL
 * is not refreshable, and the play should not count as a scrobble. */
export function isPreview(song: Song | null | undefined): boolean {
  return getContentKind(song) === 'preview';
}

/** A live stream has no known duration — hide the progress bar, timestamps
 * and seek. Podcast episodes are finite audio; a progress bar makes sense. */
export function hasFiniteDuration(song: Song | null | undefined): boolean {
  return !isLiveStream(song);
}

/** Only regular songs and podcast episodes are scrobbleable. Live streams
 * are continuous sessions (not discrete listens) and previews are 30s
 * external clips that shouldn't count as a real play. */
export function canScrobble(song: Song | null | undefined): boolean {
  const k = getContentKind(song);
  return k === 'song' || k === 'podcastEpisode';
}

/** Skip within the "track" — 15s jump buttons. Off for live streams and
 * previews (which are already short enough that jumps don't make sense). */
export function canJumpWithin(song: Song | null | undefined): boolean {
  const k = getContentKind(song);
  return k !== 'liveStream' && k !== 'preview';
}

/** Autoplay queue-fill from a seed. A radio station is its own infinite feed
 * and should not spawn recommendations at the end; a preview is a browsing
 * teaser, not a listening seed. */
export function canFillQueueFrom(song: Song | null | undefined): boolean {
  return getContentKind(song) === 'song';
}

/** A synthetic id namespace for live streams routed through the Song shape,
 * so an id collision with a real track is impossible. */
export const LIVE_STREAM_ID_PREFIX = 'radio:';
export const PODCAST_EPISODE_ID_PREFIX = 'podcast:';
