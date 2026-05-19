import type { AudioQuality } from '@/utils/redux/slices/settingsSlice';
import { qualityToStreamParams } from '@/utils/audio/streamQuality';

export interface EmbyClientConfig {
  serverUrl: string;
  token: string;
  userId: string;
  parentId?: string;
  basicAuth?: { username: string; password: string };
}

const CLIENT_HEADERS = 'MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0"';

export type EmbyClient = ReturnType<typeof createEmbyClient>;

export function createEmbyClient(config: EmbyClientConfig) {
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Emby API error (${res.status}): ${await res.text()}`);
      }
      if (res.status === 204 || res.headers.get("content-length") === "0") {
        return {} as T;
      }
      return res.json();
    } finally {
      clearTimeout(timer);
    }
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
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new Error(`Emby API error (${res.status})`);
      }
      return res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  function buildStreamUrl(songId: string, quality: AudioQuality = 'high', codec: 'mp3' | 'opus' = 'mp3'): string {
    const { format, maxBitRate } = qualityToStreamParams(quality);
    if (format === 'raw') {
      return `${baseUrl}/Audio/${songId}/stream?Static=true&api_key=${token}`;
    }
    const bitrate = (maxBitRate ?? 320) * 1000;
    const ext = codec === 'opus' ? 'opus' : 'mp3';
    return `${baseUrl}/Audio/${songId}/stream.${ext}?AudioCodec=${codec}&MaxStreamingBitrate=${bitrate}&api_key=${token}`;
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
