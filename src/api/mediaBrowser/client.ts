import type { AudioQuality } from '@/utils/redux/slices/settingsSlice';
import { qualityToStreamParams } from '@/utils/audio/streamQuality';
import { tryWithFailover, orderedUrls } from '@/utils/servers/urlFailover';
import { MediaBrowserBrand } from './brand';

export interface MediaBrowserClientConfig {
  /** Primary server URL. Used verbatim when no serverId/fallbackUrls given. */
  serverUrl: string;
  /** Server identity, needed to cache the last-known-good URL across requests. */
  serverId?: string;
  /** Extra URLs the failover layer tries after `serverUrl` (issue #115). */
  fallbackUrls?: string[];
  token: string;
  userId: string;
  parentId?: string;
  basicAuth?: { username: string; password: string };
}

const CLIENT_HEADERS = 'MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0"';

export type MediaBrowserClient = ReturnType<typeof createMediaBrowserClient>;

export function createMediaBrowserClient(config: MediaBrowserClientConfig, brand: MediaBrowserBrand) {
  const { serverUrl, serverId, fallbackUrls, token, userId, parentId, basicAuth } = config;
  const baseUrl = serverUrl.replace(/\/$/, "");
  const failoverHint = serverId
    ? { id: serverId, serverUrl: baseUrl, fallbackUrls }
    : null;
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

  async function callOne(url: string, path: string, headers: Record<string, string>, fetchOptions: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      return await fetch(`${url}${path}`, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  function withFailover<T>(attempt: (url: string) => Promise<T>): Promise<T> {
    return failoverHint
      ? tryWithFailover(failoverHint, attempt)
      : attempt(baseUrl);
  }

  async function request<T>(
    path: string,
    options: RequestInit & { tokenOnly?: boolean } = {}
  ): Promise<T> {
    const { tokenOnly, ...fetchOptions } = options;
    const headers = {
      ...(tokenOnly ? tokenOnlyHeaders : defaultHeaders),
      ...((fetchOptions.headers as Record<string, string>) ?? {}),
    };
    return withFailover(async (url) => {
      const res = await callOne(url, path, headers, fetchOptions);
      if (!res.ok) {
        throw new Error(`${brand.label} API error (${res.status}): ${await res.text()}`);
      }
      if (res.status === 204 || res.headers.get("content-length") === "0") {
        return {} as T;
      }
      return res.json();
    });
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
    return withFailover(async (url) => {
      const res = await callOne(url, path, headers, fetchOptions);
      if (!res.ok) {
        throw new Error(`${brand.label} API error (${res.status})`);
      }
      return res.text();
    });
  }

  function buildStreamUrl(songId: string, quality: AudioQuality = 'high', codec: 'mp3' | 'opus' = 'mp3'): string {
    // Streams pick up whichever URL failover has most recently confirmed alive:
    // a metadata request that just fell over to the fallback also moves the
    // stream URL onto that same address for the next `getPlayableUrl` call.
    const streamBaseUrl = failoverHint ? orderedUrls(failoverHint)[0] ?? baseUrl : baseUrl;
    const { format, maxBitRate } = qualityToStreamParams(quality);
    if (format === 'raw') {
      return `${streamBaseUrl}/Audio/${songId}/stream?Static=true&${brand.streamTokenParam}=${token}`;
    }
    const bitrate = (maxBitRate ?? 320) * 1000;
    const ext = codec === 'opus' ? 'opus' : 'mp3';
    return `${streamBaseUrl}/Audio/${songId}/stream.${ext}?AudioCodec=${codec}&MaxStreamingBitrate=${bitrate}&${brand.streamTokenParam}=${token}`;
  }

  return {
    request,
    requestText,
    serverUrl: baseUrl,
    token,
    userId,
    parentId,
    buildStreamUrl,
    brand,
  };
}
