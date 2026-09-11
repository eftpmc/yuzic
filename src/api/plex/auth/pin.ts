import { fetchWithTimeout } from '@/api/fetchWithTimeout';
import { plexHeaders } from '../client';
import type { PlexPinResponse } from '../types';
import type { BasicAuth } from '@/types';

const PLEX_ACCOUNT = 'https://plex.tv';

type PlexUserResponse = { username?: string; title?: string };

async function accountRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetchWithTimeout(`${PLEX_ACCOUNT}${path}`, {
    ...init,
    headers: { ...plexHeaders(undefined), ...init.headers },
  });
  if (!response.ok) throw new Error(`Plex account request failed (${response.status})`);
  return response.json() as Promise<T>;
}

/**
 * Plex PIN sign-in. The server URL is intentionally not sent to plex.tv: PIN
 * approval grants an account token, then the normal provider ping verifies
 * that token against the server the user selected.
 */
export async function beginPlexPin(_serverUrl: string, _basicAuth?: BasicAuth) {
  const pin = await accountRequest<PlexPinResponse>('/api/v2/pins?strong=true', { method: 'POST' });
  if (!pin.id || !pin.code) throw new Error('Plex did not return a sign-in code.');
  return { code: pin.code, handle: String(pin.id) };
}

export async function pollPlexPin(handle: string, _serverUrl: string, _basicAuth?: BasicAuth) {
  const pin = await accountRequest<PlexPinResponse>(`/api/v2/pins/${encodeURIComponent(handle)}`);
  if (!pin.authToken) return null;
  const user = await accountRequest<PlexUserResponse>('/api/v2/user', {
    headers: { 'X-Plex-Token': pin.authToken },
  });
  return { auth: { token: pin.authToken }, username: user.username ?? user.title ?? 'Plex' };
}
