import type { BasicAuth } from '@/types';
import { getInstallationId } from '@/utils/installationId';
import { tryWithFailover, orderedUrls } from '@/utils/servers/urlFailover';
import { serverFetch } from '@/features/mtls/serverFetch';
import type { PlexResponse } from './types';

export type PlexClientConfig = {
  serverUrl: string;
  /** Stable identity lets API calls remember the last reachable endpoint. */
  serverId?: string;
  /** Extra LAN/Tailscale/public endpoints to try after the primary. */
  fallbackUrls?: string[];
  token?: string;
  basicAuth?: BasicAuth;
};

const PRODUCT = 'Yuzic';
const VERSION = '1.0.0';

function cleanBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

/**
 * The `Authorization: Basic` header for a reverse proxy in front of a server,
 * or nothing when there is no Basic auth to send. The single construction of
 * this value — the base64 of `user:pass` — lives here so a stream/artwork
 * request built elsewhere reuses it rather than re-deriving credentials.
 */
export function plexBasicAuthHeader(basicAuth?: BasicAuth): Record<string, string> | undefined {
  if (!basicAuth) return undefined;
  return { Authorization: `Basic ${global.btoa(`${basicAuth.username}:${basicAuth.password}`)}` };
}

/**
 * Plex's server API is JSON when `Accept: application/json` is set. The
 * persistent client id is required by Plex and is deliberately the same
 * per-install identity MediaBrowser uses, never a launch-generated id.
 */
export function plexHeaders(token?: string, basicAuth?: BasicAuth): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Plex-Product': PRODUCT,
    'X-Plex-Version': VERSION,
    'X-Plex-Device': 'Mobile',
    'X-Plex-Client-Identifier': getInstallationId(),
  };
  if (token) headers['X-Plex-Token'] = token;
  return { ...headers, ...plexBasicAuthHeader(basicAuth) };
}

export function createPlexClient(config: PlexClientConfig) {
  const baseUrl = cleanBaseUrl(config.serverUrl);
  const failoverHint = config.serverId
    ? { id: config.serverId, serverUrl: baseUrl, fallbackUrls: config.fallbackUrls }
    : null;
  const withFailover = <T,>(attempt: (url: string) => Promise<T>): Promise<T> =>
    failoverHint ? tryWithFailover(failoverHint, attempt) : attempt(baseUrl);
  const reachableBaseUrl = () => failoverHint ? orderedUrls(failoverHint)[0] ?? baseUrl : baseUrl;

  async function request<T = PlexResponse>(path: string, init: RequestInit = {}): Promise<T> {
    if (path.startsWith('http')) {
      const response = await serverFetch(path, {
        ...init,
        headers: { ...plexHeaders(config.token, config.basicAuth), ...init.headers },
      });
      if (!response.ok) throw new Error(`Plex request failed (${response.status})`);
      return response.json() as Promise<T>;
    }
    return withFailover(async (url) => {
      const response = await serverFetch(`${url}${path}`, {
        ...init,
        headers: { ...plexHeaders(config.token, config.basicAuth), ...init.headers },
      });
      if (!response.ok) throw new Error(`Plex request failed (${response.status})`);
      return response.json() as Promise<T>;
    });
  }

  /** Direct-play path built from the part key preserved as Song.streamId. */
  function buildStreamUrl(partKey: string): string {
    if (!partKey) return '';
    const separator = partKey.includes('?') ? '&' : '?';
    const token = config.token ? `${separator}X-Plex-Token=${encodeURIComponent(config.token)}` : '';
    return `${reachableBaseUrl()}${partKey}${token}`;
  }

  function buildImageUrl(path?: string): string | null {
    if (!path) return null;
    const separator = path.includes('?') ? '&' : '?';
    const token = config.token ? `${separator}X-Plex-Token=${encodeURIComponent(config.token)}` : '';
    return `${reachableBaseUrl()}${path}${token}`;
  }

  return { baseUrl, request, buildStreamUrl, buildImageUrl };
}

export type PlexClient = ReturnType<typeof createPlexClient>;
