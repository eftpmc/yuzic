import type { SectionConfig } from './hooks/useDailyLayout'

/**
 * Which tier each home section belongs to.
 *
 * Home used to render nine sections as one flat run of identical horizontal
 * strips, so resuming what you were listening to, browsing your own library
 * and speculative external picks all carried the same weight and nothing read
 * as more important than anything else. Grouping them is what gives the screen
 * an order of importance; the sections themselves are unchanged.
 */

/** What you were doing. Highest confidence, so it comes first and unlabelled —
 * it is the default context rather than a category. */
export function buildResumeSections(): SectionConfig[] {
  return [
    { key: 'quickPicks', type: 'quickPicks' },
    { key: 'recentlyPlayed', type: 'recentlyPlayed' },
  ]
}

/**
 * Your own collection, sliced by the two things a sort order can't express:
 * what arrived recently, and what you actually play.
 *
 * Deliberately short. This tier used to also carry favourites and a random
 * draw — favourites is reachable as a playlist, and a random shuffle of albums
 * is a gimmick rather than an answer to a question anyone is asking, so both
 * cost the screen more than they returned. Anything static and exhaustive
 * belongs in the Library tab; what earns a place here changes on its own.
 *
 * Empty when there is no library at all, so a new account doesn't get a header
 * with nothing under it. Individual sections still hide themselves when they
 * have no content of their own.
 */
export function buildLibrarySections(hasLibrary: boolean): SectionConfig[] {
  if (!hasLibrary) return []
  return [
    { key: 'recentlyAdded', type: 'recentlyAdded' },
    { key: 'mostPlayed', type: 'mostPlayed' },
  ]
}

/**
 * Music you don't own yet. Sits last behind its own source header, and is
 * absent offline — every section here needs the network.
 */
export function buildDiscoverySections(options: {
  isOffline: boolean
  hasLibrary: boolean
  becauseSeeds: string[]
  topGenres: string[]
}): SectionConfig[] {
  if (options.isOffline) return []

  const pool: SectionConfig[] = [
    { key: 'topArtists', type: 'topArtists' },
    { key: 'charts', type: 'charts' },
  ]

  // Both of these are seeded from what the user already listens to, so they
  // have nothing to work from without a library.
  if (options.hasLibrary) {
    for (const name of options.becauseSeeds) {
      pool.push({ key: `becauseYouListened:${name}`, type: 'becauseYouListened', artistName: name })
    }
    for (const genre of options.topGenres) {
      pool.push({ key: `genre:${genre}`, type: 'genre', genre })
    }
  }

  return pool
}
