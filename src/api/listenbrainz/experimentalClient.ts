const BASE_URL = 'https://labs.api.listenbrainz.org';

/**
 * Experimental ListenBrainz Labs client
 *
 * Labs APIs are NOT stable.
 * No authentication is required.
 * Responses may change without notice.
 */
export function createListenBrainzExperimentalClient() {
  async function request<T>(
    path: string,
    params?: Record<string, string | number | boolean>
  ): Promise<T> {
    const search = params
      ? `?${new URLSearchParams(
          Object.entries(params).map(([k, v]) => [k, String(v)])
        ).toString()}`
      : '';

    const res = await fetch(`${BASE_URL}${path}${search}`);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(
        `ListenBrainz Labs error (${res.status}): ${text}`
      );
    }

    return res.json();
  }

  return { request };
}
