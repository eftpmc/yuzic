import type { AlbumBase } from '@/types';

/**
 * Builds the browsable genre list.
 *
 * The server reports its own genre list, but the genre screen selects albums
 * with `album.genres.includes(genre)` — an exact string match. A genre the
 * server knows about that no album's tags match would open an empty screen, so
 * the count is computed with the same rule and empty genres are left out.
 */

export type GenreRow = {
  genre: string;
  albumCount: number;
};

export function buildGenreRows(
  genres: string[],
  albums: Pick<AlbumBase, 'genres'>[]
): GenreRow[] {
  const counts = new Map<string, number>();
  for (const album of albums) {
    for (const genre of album.genres ?? []) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }

  const seen = new Set<string>();
  const rows: GenreRow[] = [];
  for (const genre of genres) {
    if (seen.has(genre)) continue;
    seen.add(genre);
    const albumCount = counts.get(genre) ?? 0;
    if (albumCount > 0) rows.push({ genre, albumCount });
  }

  // Alphabetical: a browse list is scanned for a name, not ranked by size.
  return rows.sort((a, b) => a.genre.localeCompare(b.genre));
}
