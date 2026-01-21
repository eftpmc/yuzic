import { ListenBrainzConfig } from '@/types';

const BASE_URL = 'https://api.listenbrainz.org/1';

/**
 * ListenBrainz client
 *
 * Requires:
 *  - username (for user-scoped endpoints)
 *  - token (for authenticated requests)
 */
export function createListenBrainzClient(config: ListenBrainzConfig) {
  const { username, token } = config;

  if (!username || !token) {
    throw new Error('ListenBrainz not configured');
  }

  async function request<T>(
    path: string,
    options?: {
      method?: 'GET' | 'POST';
      body?: any;
      auth?: boolean;
    }
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      auth = true,
    } = options || {};

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(auth && { Authorization: `Token ${token}` }),
      },
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `ListenBrainz API error (${res.status}): ${text}`
      );
    }

    return res.json();
  }

  return {
    request
  };
}