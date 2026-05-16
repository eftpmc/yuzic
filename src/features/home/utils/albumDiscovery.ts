import * as deezer from '@/api/deezer';
import type { ExternalAlbumBase, ExternalArtistBase } from '@/types';

const DEFAULT_ARTIST_BATCH_SIZE = 4;
const DEFAULT_ALBUMS_PER_ARTIST = 5;

type CollectCoveredAlbumsOptions = {
  targetAlbums: number;
  albumsPerArtist?: number;
  artistBatchSize?: number;
  excludeAlbumIds?: Iterable<string>;
};

export async function collectCoveredAlbumsForArtists(
  artists: ExternalArtistBase[],
  {
    targetAlbums,
    albumsPerArtist = DEFAULT_ALBUMS_PER_ARTIST,
    artistBatchSize = DEFAULT_ARTIST_BATCH_SIZE,
    excludeAlbumIds = [],
  }: CollectCoveredAlbumsOptions
): Promise<ExternalAlbumBase[]> {
  if (targetAlbums <= 0) return [];

  const albums: ExternalAlbumBase[] = [];
  const seenAlbums = new Set(excludeAlbumIds);

  for (let i = 0; i < artists.length && albums.length < targetAlbums; i += artistBatchSize) {
    const results = await Promise.allSettled(
      artists.slice(i, i + artistBatchSize).map(async artist => {
        const artistAlbums = await deezer.getDeezerArtistAlbums(artist.id, albumsPerArtist, artist);
        return artistAlbums.find(a => a.cover.kind !== 'none') ?? null;
      })
    );

    for (const result of results) {
      if (albums.length >= targetAlbums) break;
      if (result.status !== 'fulfilled' || !result.value || seenAlbums.has(result.value.id)) continue;
      seenAlbums.add(result.value.id);
      albums.push(result.value);
    }
  }

  return albums;
}
