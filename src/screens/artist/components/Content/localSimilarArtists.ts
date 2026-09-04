import type { AlbumBase, CoverSource } from '@/types';

export type LocalArtistSummary = {
  id: string;
  name: string;
  cover: CoverSource;
  subtext: string;
};

// A cheap, always-available approximation of "similar artists" — other
// library artists sharing genre tags with this one. Materially weaker than a
// real similarity graph (Deezer/Last.fm), which is why it's labeled and
// rendered as its own sub-group rather than merged into their results.
export function findArtistsWithSharedGenres(
  targetArtistId: string,
  albums: AlbumBase[],
  limit = 8
): LocalArtistSummary[] {
  const genresByArtist = new Map<string, Set<string>>();
  const artistMeta = new Map<string, LocalArtistSummary>();

  for (const album of albums) {
    const artistId = album.artist.id;
    if (!artistMeta.has(artistId)) {
      artistMeta.set(artistId, {
        id: artistId,
        name: album.artist.name,
        cover: album.artist.cover,
        subtext: album.artist.subtext,
      });
    }
    const genres = genresByArtist.get(artistId) ?? new Set<string>();
    album.genres.forEach(g => genres.add(g));
    genresByArtist.set(artistId, genres);
  }

  const targetGenres = genresByArtist.get(targetArtistId);
  if (!targetGenres || targetGenres.size === 0) return [];

  return [...artistMeta.keys()]
    .filter(id => id !== targetArtistId)
    .map(id => {
      const genres = genresByArtist.get(id) ?? new Set<string>();
      let overlap = 0;
      for (const g of genres) if (targetGenres.has(g)) overlap++;
      return { id, overlap };
    })
    .filter(candidate => candidate.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, limit)
    .map(candidate => artistMeta.get(candidate.id)!);
}
