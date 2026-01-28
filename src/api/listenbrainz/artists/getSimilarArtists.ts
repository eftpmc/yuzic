import { createListenBrainzExperimentalClient } from '../experimentalClient'

export type SimilarArtistLabs = {
  artist_mbid: string
  score: number
}

type SimilarArtistsResponse = {
  similar_artists?: SimilarArtistLabs[]
}

const DEFAULT_ALGORITHM =
  'session_based_days_1825_session_300_contribution_3_threshold_10_limit_100_filter_True_skip_30'

const MIN_SIMILARITY_SCORE = 0.15

export async function getSimilarArtists(
  artistMbid: string,
  options?: {
    limit?: number
    algorithm?: string
  }
): Promise<SimilarArtistLabs[]> {
  if (!artistMbid) return []

  const { limit = 20, algorithm = DEFAULT_ALGORITHM } = options || {}

  try {
    const { request } = createListenBrainzExperimentalClient()

    const res = await request<SimilarArtistLabs[]>(
      '/similar-artists/json',
      {
        artist_mbids: artistMbid,
        algorithm,
        limit: limit * 2,
      }
    )

    if (!Array.isArray(res)) return []

    return res
      .filter(a => a.score >= MIN_SIMILARITY_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  } catch (error) {
    console.warn(
      'ListenBrainz Labs similar-artists failed:',
      error
    )
    return []
  }
}