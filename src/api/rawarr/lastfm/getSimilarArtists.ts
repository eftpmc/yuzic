export type LastFmSimilarArtist = {
  name: string
  mbid: string | null
  match: number
  image: string | null
}

export async function getLastFmSimilarArtists(
  rawarrUrl: string,
  artistName: string,
  limit = 20
): Promise<LastFmSimilarArtist[]> {
  try {
    const params = new URLSearchParams({
      artist: artistName,
      limit: String(limit),
    });
    const res = await fetch(`${rawarrUrl}/api/lastfm/similar-artists?${params}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.artists) ? data.artists : [];
  } catch {
    return [];
  }
}
