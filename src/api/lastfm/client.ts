import { fetchWithTimeout } from '../fetchWithTimeout';

const LASTFM_BASE = 'https://ws.audioscrobbler.com/2.0/';

/**
 * Unsigned request to a Last.fm read endpoint. yuzic uses Last.fm as a
 * read-only metadata source (similar artists, top tracks), so no api_secret,
 * no MD5 signing and no session key — just a bundled api_key.
 */
export async function lastfmRequest<T = unknown>(
  params: Record<string, string>,
  config: { apiKey: string }
): Promise<T> {
  const body = new URLSearchParams({
    ...params,
    api_key: config.apiKey,
    format: 'json',
  });
  const res = await fetchWithTimeout(LASTFM_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  const data = await res.json();
  if (data.error) throw new Error(data.message ?? `LastFM error ${data.error}`);
  return data as T;
}
