/**
 * Which library genres are fit to put in front of someone.
 *
 * Tag data is not curated. A Navidrome scan of a real library reliably yields
 * a genre called "Unknown" — the bucket for everything untagged — and that
 * bucket is usually the largest one, so a shuffle over the raw list picks it
 * far more often than any real genre. "Today's Unknown" over a shelf of one
 * untagged album is what a broken feature looks like, even though every part
 * of it worked exactly as written.
 *
 * These are placeholders rather than genres: they name the absence of a tag,
 * or a catch-all that says nothing about how the music sounds. A shelf headed
 * with one can't mean anything, so they never become a heading.
 */
const PLACEHOLDER_GENRES = new Set([
  'unknown',
  'unknown genre',
  'other',
  'misc',
  'miscellaneous',
  'various',
  'various genres',
  'none',
  'n/a',
  'no genre',
  'untagged',
  'genre',
])

/** True when a genre names real music rather than the absence of a tag. */
export function isPresentableGenre(genre: string): boolean {
  const normalized = genre.trim()
  if (!normalized) return false
  return !PLACEHOLDER_GENRES.has(normalized.toLowerCase())
}

/**
 * The genres worth heading a shelf with, in the order given, deduplicated
 * case-insensitively so "Hip-Hop" and "hip-hop" don't both get a day.
 */
export function presentableGenres(genres: readonly string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const genre of genres) {
    const normalized = genre.trim()
    if (!isPresentableGenre(normalized)) continue
    const key = normalized.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(normalized)
  }
  return result
}
