import { lastfmRequest } from './client';

export type LastFmSimilarArtist = {
  name: string
  mbid: string | null
  match: number
  image: string | null
}

// artist.getSimilar is a public read — no session or api_sig needed, just the
// user's own Last.fm api_key (they already gave it for scrobbling).
export async function getLastFmSimilarArtists(
  apiKey: string,
  artistName: string,
  limit = 20
): Promise<LastFmSimilarArtist[]> {
  if (!apiKey || !artistName.trim()) return [];
  try {
    const data = await lastfmRequest<{
      similarartists?: {
        artist?: Array<{
          name?: string
          mbid?: string
          match?: string
          image?: Array<{ '#text'?: string; size?: string }>
        }>
      }
    }>(
      {
        method: 'artist.getsimilar',
        artist: artistName,
        limit: String(limit),
        autocorrect: '1',
      },
      { apiKey }
    );

    const raw = data.similarartists?.artist ?? [];
    return raw
      .map(a => {
        const name = (a.name ?? '').trim();
        if (!name) return null;
        // Last.fm returns multiple sizes; take the largest.
        const image = a.image?.length
          ? a.image[a.image.length - 1]?.['#text']?.trim() || null
          : null;
        return {
          name,
          mbid: a.mbid?.trim() || null,
          match: Number(a.match ?? 0),
          image: image && image.length > 0 ? image : null,
        };
      })
      .filter((a): a is LastFmSimilarArtist => a !== null);
  } catch {
    return [];
  }
}
