import { ExternalArtistBase, LastfmConfig } from '@/types';
import { createLastfmClient } from '../client';
import { nanoid } from 'nanoid/non-secure';

export type GetSimilarArtistsResult = ExternalArtistBase[];

const normalizeSimilarArtist = (artist: any): ExternalArtistBase => {

  return {
    id: artist.mbid || `lastfm:artist:${nanoid()}`,
    name: artist.name,
    cover: { kind: "none" },
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

    return Array.isArray(res.similarartists?.artist)
      ? res.similarartists.artist.map(normalizeSimilarArtist)
      : [];
  } catch (error) {
    console.warn(
      `❌ Failed to fetch similar artists for "${artistName}":`,
      error
    );
    return [];
  }
};