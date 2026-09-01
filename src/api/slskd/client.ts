import { fetchWithTimeout } from '../fetchWithTimeout';

export interface SlskdConfig {
  serverUrl: string;
  apiKey: string;
}

export type SlskdClient = ReturnType<typeof createSlskdClient>;

export function createSlskdClient(config: SlskdConfig) {
  const { serverUrl, apiKey } = config;

  if (!serverUrl || !apiKey) {
    throw new Error('slskd not configured');
  }

  const baseUrl = `${serverUrl.replace(/\/$/, '')}/api/v0`;

  async function request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const res = await fetchWithTimeout(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'X-API-Key': apiKey,
        ...(options.headers as Record<string, string> ?? {}),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`slskd API error (${res.status}): ${text}`);
    }

    // DELETE and other no-content replies have no body to parse.
    if (res.status === 204 || res.headers?.get?.('content-length') === '0') {
      return {} as T;
    }

    return res.json();
  }

  return { request, baseUrl };
}
