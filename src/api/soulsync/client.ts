import { fetchWithTimeout } from '../fetchWithTimeout';

export interface SoulSyncConfig {
  serverUrl: string;
  apiKey: string;
}

export type SoulSyncClient = ReturnType<typeof createSoulSyncClient>;

/**
 * Every SoulSync reply is wrapped in the same envelope, success or failure,
 * and the HTTP status carries the same information a second time. The client
 * unwraps it so callers see `data` or an Error, never the envelope.
 */
type SoulSyncEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: { code: string; message: string } | null;
};

/** Carries SoulSync's own error code so callers can map it to a message. */
export class SoulSyncError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'SoulSyncError';
    this.code = code;
  }
}

export function createSoulSyncClient(config: SoulSyncConfig) {
  const { serverUrl, apiKey } = config;

  if (!serverUrl || !apiKey) {
    throw new Error('SoulSync not configured');
  }

  const baseUrl = `${serverUrl.replace(/\/+$/, '')}/api/v1`;

  async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const res = await fetchWithTimeout(`${baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        // The query-param form (?api_key=) is also accepted, but a key in a
        // URL ends up in logs and history — the header is the one to use.
        Authorization: `Bearer ${apiKey}`,
        ...((options.headers as Record<string, string>) ?? {}),
      },
    });

    const body = await res.text();
    let envelope: SoulSyncEnvelope<T> | null = null;
    try {
      envelope = body ? (JSON.parse(body) as SoulSyncEnvelope<T>) : null;
    } catch {
      // A reverse proxy in front of SoulSync, or the wrong URL entirely, will
      // answer with HTML. Say so rather than reporting "undefined".
      throw new SoulSyncError('BAD_RESPONSE', `SoulSync sent a non-JSON reply (${res.status})`);
    }

    if (envelope?.error) {
      throw new SoulSyncError(envelope.error.code, envelope.error.message);
    }
    if (!res.ok) {
      throw new SoulSyncError('HTTP_ERROR', `SoulSync API error (${res.status})`);
    }

    return (envelope?.data ?? ({} as T));
  }

  return { request, baseUrl };
}
