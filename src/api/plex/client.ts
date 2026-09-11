import type { BasicAuth } from '@/types';
import { getInstallationId } from '@/utils/installationId';
import { serverFetch } from '@/features/mtls/serverFetch';
import type { PlexResponse } from './types';

export type PlexClientConfig = {
  serverUrl: string;
  token?: string;
  basicAuth?: BasicAuth;
};

const PRODUCT = 'Yuzic';
const VERSION = '1.0.0';

function cleanBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
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
  if (basicAuth) headers.Authorization = `Basic ${global.btoa(`${basicAuth.username}:${basicAuth.password}`)}`;
  return headers;
}

export function createPlexClient(config: PlexClientConfig) {
  const baseUrl = cleanBaseUrl(config.serverUrl);

  async function request<T = PlexResponse>(path: string, init: RequestInit = {}): Promise<T> {
    const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
    const response = await serverFetch(url, {
      ...init,
      headers: { ...plexHeaders(config.token, config.basicAuth), ...init.headers },
    });
    if (!response.ok) throw new Error(`Plex request failed (${response.status})`);
    return response.json() as Promise<T>;
  }

  /** Direct-play path built from the part key preserved as Song.streamId. */
  function buildStreamUrl(partKey: string): string {
    if (!partKey) return '';
    const separator = partKey.includes('?') ? '&' : '?';
    const token = config.token ? `${separator}X-Plex-Token=${encodeURIComponent(config.token)}` : '';
    return `${baseUrl}${partKey}${token}`;
  }

  function buildImageUrl(path?: string): string | null {
    if (!path) return null;
    const separator = path.includes('?') ? '&' : '?';
    const token = config.token ? `${separator}X-Plex-Token=${encodeURIComponent(config.token)}` : '';
    return `${baseUrl}${path}${token}`;
  }

  return { baseUrl, request, buildStreamUrl, buildImageUrl };
}

export type PlexClient = ReturnType<typeof createPlexClient>;
