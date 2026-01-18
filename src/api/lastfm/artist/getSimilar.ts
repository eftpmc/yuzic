import { ArtistBase, CoverSource, LastfmConfig } from '@/types';
import { createLastfmClient } from '../client';

export type GetSimilarArtistsResult = ArtistBase[];

const normalizeSimilarArtist = (artist: any): ArtistBase => {
  const cover: CoverSource = artist.image?.length
    ? {
        kind: 'lastfm',
        url:
          artist.image.find((i: any) => i.size === 'large')?.['#text'] ??
          artist.image[0]?.['#text'] ??
          '',
      }
    : { kind: 'none' };

  return {
    id: artist.mbid || artist.name,
    name: artist.name,
    cover,
    subtext: 'Artist',
  };
};

export const getSimilarArtists = async (
  config: LastfmConfig,
  artistName: string,
  limit = 12
): Promise<GetSimilarArtistsResult> => {
  try {
    const { request } = createLastfmClient(config);

    const res = await request<{
      similarartists?: { artist?: any[] };
    }>({
      method: 'artist.getsimilar',
      artist: artistName,
      limit: String(limit),
    });

    const artists = Array.isArray(res.similarartists?.artist)
      ? res.similarartists!.artist.map(normalizeSimilarArtist)
      : [];

    return artists;
  } catch (error) {
    console.warn(
      `❌ Failed to fetch similar artists for "${artistName}":`,
      error
    );
    return [];
  }
};