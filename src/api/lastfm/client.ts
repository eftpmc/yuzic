import { LastfmConfig } from '@/types';

const BASE_URL = 'https://ws.audioscrobbler.com/2.0/';

export function createLastfmClient(config: LastfmConfig) {
  const { apiKey } = config;

  if (!apiKey) {
    throw new Error('Last.fm not configured');
  }

  async function request<T>(
    params: Record<string, string>,
  ): Promise<T> {
    const search = new URLSearchParams({
      ...params,
      api_key: apiKey,
      format: 'json',
    });

    const res = await fetch(`${BASE_URL}?${search.toString()}`);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `Last.fm API error (${res.status}): ${text}`
      );
    }

    return res.json();
  }

  return { request };
}