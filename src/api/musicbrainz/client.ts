const BASE_URL = 'https://musicbrainz.org/ws/2';

/** Shared for MusicBrainz and Wikidata; Wikidata requires a proper User-Agent per Wikimedia policy. */
export const USER_AGENT = 'Yuzic/1.1.6 (eftpmc1@gmail.com)';

export function createMusicBrainzClient() {
  async function request<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T> {
    const search = new URLSearchParams({
      ...params,
      fmt: 'json',
    });

    const res = await fetch(`${BASE_URL}/${endpoint}?${search.toString()}`, {
      headers: {
        'User-Agent': USER_AGENT,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `MusicBrainz API error (${res.status}): ${text}`
      );
    }

    return res.json();
  }

  return { request };
}