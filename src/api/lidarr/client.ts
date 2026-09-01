import { LidarrConfig } from '@/types';
import { fetchWithTimeout } from '../fetchWithTimeout';

export type LidarrClient = ReturnType<typeof createLidarrClient>;

export function createLidarrClient(config: LidarrConfig) {
  const { serverUrl, apiKey } = config;

  if (!serverUrl || !apiKey) {
    throw new Error('Lidarr not configured');
  }

  const baseUrl = `${serverUrl.replace(/\/$/, '')}/api/v1`;

  async function request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetchWithTimeout(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': apiKey,
        ...(options.headers ?? {}),
      },
    });

    if (!res.ok) {
      throw new Error(`Lidarr API error (${res.status})`);
    }

    if (res.status === 204) return {} as T;
    return res.json();
  }

  return { request };
}
