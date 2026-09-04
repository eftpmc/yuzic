import type { AlbumBase } from '@/types';

/**
 * Splits an artist's releases between the Albums and the Singles & EPs
 * sections.
 *
 * Track count decides it whenever the library knows one. It often doesn't —
 * a release whose tracks haven't been indexed reports zero — so the title is
 * the fallback, and that fallback is what the word boundaries below are for.
 */

/** At most this many tracks reads as a single or an EP rather than an album. */
export const SINGLE_OR_EP_MAX_TRACKS = 6;

/**
 * "ep" or "single" as whole words.
 *
 * A plain substring test mis-files real albums: " ep" matches "The Epic", and
 * "single" matches "Singles Collection" — a compilation, not a single. It also
 * missed a release titled just "EP", which has no leading space.
 */
const SINGLE_OR_EP_TITLE = /\b(ep|single)\b/;

export function isSingleOrEpTitle(title: string): boolean {
  return SINGLE_OR_EP_TITLE.test(title.toLowerCase());
}

/**
 * @param songCount tracks the library knows about; zero means unknown, not
 * empty, so it falls through to the title rather than counting as a single.
 */
export function isSingleOrEp(album: AlbumBase, songCount: number): boolean {
  if (songCount > 0) return songCount <= SINGLE_OR_EP_MAX_TRACKS;
  return isSingleOrEpTitle(album.title);
}
