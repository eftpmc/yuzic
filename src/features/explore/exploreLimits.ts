/**
 * Limits for explore sync and display. Sync diffs library artists vs processed,
 * fetches similar artists (and their albums) for new ones only, up to these caps.
 */

export const EXPLORE_LIMITS = {
  /** Max similar artists to have in the explore pool. Explorer stops when reached. */
  artists: 40,
  /** Max new library artists to process per sync run. */
  artistsPerSync: 20,
  /** Items to show per explore section (artists, albums, new albums). */
  displayPerSection: 12,
} as const
