import { fetchWithTimeout } from '../../fetchWithTimeout';

export type LBSimilarArtist = {
  artistMbid: string;
  name: string;
  score: number;
};

/**
 * Similar-artists driven by ListenBrainz's session-based algorithm. Unlike
 * user recommendations, this endpoint is public (no auth needed) and keyed by
 * an MBID rather than a user, so it works for any artist we can look up.
 */
export async function getLBSimilarArtists(
  artistMbid: string,
  limit = 12
): Promise<LBSimilarArtist[]> {
  if (!artistMbid) return [];
  try {
    const url =
      `https://api.listenbrainz.org/1/similar-artists` +
      `?artist_mbids=${encodeURIComponent(artistMbid)}` +
      `&algorithm=session_based_days_7500_session_300_contribution_5_threshold_10_limit_100_filter_True_skip_30` +
      `&count=${limit}`;
    const res = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as Array<{ artist_mbid?: string; name?: string; score?: number }>;
    return (Array.isArray(data) ? data : [])
      .filter((r): r is { artist_mbid: string; name: string; score?: number } =>
        typeof r?.artist_mbid === 'string' && typeof r?.name === 'string'
      )
      .slice(0, limit)
      .map((r) => ({
        artistMbid: r.artist_mbid,
        name: r.name,
        score: Number(r.score ?? 0),
      }));
  } catch {
    return [];
  }
}
