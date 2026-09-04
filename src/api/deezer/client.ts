import { fetchWithTimeout } from '../fetchWithTimeout';

const BASE_URL = 'https://api.deezer.com';

async function request<T>(path: string): Promise<T> {
  const res = await fetchWithTimeout(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Deezer API error (${res.status})`);
  return res.json();
}

export const deezerClient = { request };
