export interface JellyfinClientConfig {
  serverUrl: string;
  token: string;
  userId: string;
  parentId?: string;
  basicAuth?: { username: string; password: string };
}

const CLIENT_HEADERS = 'MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0"';

export type JellyfinClient = ReturnType<typeof createJellyfinClient>;

export function createJellyfinClient(config: JellyfinClientConfig) {
  const { serverUrl, token, userId, parentId, basicAuth } = config;
  const baseUrl = serverUrl.replace(/\/$/, "");
  const proxyHeader: Record<string, string> = basicAuth
    ? { Authorization: 'Basic ' + btoa(`${basicAuth.username}:${basicAuth.password}`) }
    : {};

  const defaultHeaders: Record<string, string> = {
    "X-Emby-Token": token,
    "X-Emby-Authorization": `${CLIENT_HEADERS}, Token="${token}"`,
    ...proxyHeader,
  };

  const tokenOnlyHeaders: Record<string, string> = {
    "X-Emby-Token": token,
    ...proxyHeader,
  };

  async function request<T>(
    path: string,
    options: RequestInit & { tokenOnly?: boolean } = {}
  ): Promise<T> {
    const { tokenOnly, ...fetchOptions } = options;
    const headers = {
      ...(tokenOnly ? tokenOnlyHeaders : defaultHeaders),
      ...((fetchOptions.headers as Record<string, string>) ?? {}),
    };
    const res = await fetch(`${baseUrl}${path}`, {
      ...fetchOptions,
      headers,
    });
    if (!res.ok) {
      throw new Error(`Jellyfin API error (${res.status}): ${await res.text()}`);
    }
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return {} as T;
    }
    return res.json();
  }

  async function requestText(
    path: string,
    options: RequestInit & { tokenOnly?: boolean } = {}
  ): Promise<string> {
    const { tokenOnly, ...fetchOptions } = options;
    const headers = {
      ...(tokenOnly ? tokenOnlyHeaders : defaultHeaders),
      ...((fetchOptions.headers as Record<string, string>) ?? {}),
    };
    const res = await fetch(`${baseUrl}${path}`, {
      ...fetchOptions,
      headers,
    });
    if (!res.ok) {
      throw new Error(`Jellyfin API error (${res.status})`);
    }
    return res.text();
  }

  function buildStreamUrl(songId: string): string {
    return `${baseUrl}/Audio/${songId}/stream.mp3?X-Emby-Token=${token}`;
  }

  return {
    request,
    requestText,
    serverUrl: baseUrl,
    token,
    userId,
    parentId,
    buildStreamUrl,
  };
}
