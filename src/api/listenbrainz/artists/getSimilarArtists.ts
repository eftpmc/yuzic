import { createListenBrainzExperimentalClient } from '../experimentalClient';

export type SimilarArtistLabs = {
  artist_mbid: string;
  score: number;
};

type SimilarArtistsResponse = {
  similar_artists?: SimilarArtistLabs[];
};

const DEFAULT_ALGORITHM =
  'session_based_days_1825_session_300_contribution_3_threshold_10_limit_100_filter_True_skip_30';

export async function getSimilarArtists(
  artistMbid: string,
  options?: {
    limit?: number;
    algorithm?: string;
  }
): Promise<SimilarArtistLabs[]> {
  if (!artistMbid) return [];

  const { limit = 20, algorithm = DEFAULT_ALGORITHM } = options || {};

  try {
    const { request } = createListenBrainzExperimentalClient();

    const res = await request<SimilarArtistsResponse>(
      '/similar-artists/json',
      {
        artist_mbids: artistMbid,
        algorithm,
        limit,
      }
    );

    if (Array.isArray(res)) {
      return res;
    }

    return [];
  } catch (error) {
    console.warn(
      'ListenBrainz Labs similar-artists failed:',
      error
    );
    return [];
  }
}