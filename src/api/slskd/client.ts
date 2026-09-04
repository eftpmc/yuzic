import { fetchWithTimeout } from '../fetchWithTimeout';

/**
 * User controls over how slskd chooses what to download. Slskd search is
 * inherently fuzzy; these tell the picker which of the fuzzy answers count.
 */
export interface SlskdSearchPreferences {
  /**
   * `'auto'` keeps the current heuristic — prefer flac when a peer has flacs,
   * accept mp3 otherwise. `'flac'` throws away everything that isn't flac,
   * so a user who explicitly wants lossless never gets an mp3 fallback.
   */
  preferredFormat: 'auto' | 'flac';
  /**
   * When set, drops mp3 candidates whose reported bitrate is under this. A
   * candidate with an unknown bitrate is kept — many peers omit the field.
   */
  minBitrateKbps: number;
  /**
   * A peer with no free upload slot queues you behind whoever they're already
   * uploading to. On by default; turning it off lets slskd pick a rare
   * release even if it means waiting in a queue.
   */
  preferFreeSlot: boolean;
}

export const DEFAULT_SLSKD_PREFERENCES: SlskdSearchPreferences = {
  preferredFormat: 'auto',
  minBitrateKbps: 0,
  preferFreeSlot: true,
};

export interface SlskdConfig {
  serverUrl: string;
  apiKey: string;
  /** Undefined means "use defaults" — kept optional so unrelated calls don't care. */
  preferences?: SlskdSearchPreferences;
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
