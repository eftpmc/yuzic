// md5 does not ship TypeScript declarations in this project.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const md5 = require("md5") as (s: string) => string;
import type { AudioQuality } from '@/utils/redux/slices/settingsSlice';
import { qualityToStreamParams } from '@/utils/audio/streamQuality';

export interface NavidromeClientConfig {
  serverUrl: string;
  username: string;
  password: string;
  defaultParams?: Record<string, string | number>;
  basicAuth?: { username: string; password: string };
}

const API_VERSION = "1.16.0";
const CLIENT_NAME = "Yuzic";

export type NavidromeClient = ReturnType<typeof createNavidromeClient>;

function randomSalt(): string {
  return Math.random().toString(36).slice(2, 14);
}

export function buildTokenParams(username: string, password: string): {
  u: string;
  t: string;
  s: string;
} {
  const salt = randomSalt();
  const token = md5(password + salt);
  return { u: username, t: token, s: salt };
}

function buildParams(
  auth: { u: string; t: string; s: string },
  extra: Record<string, string | number> = {},
  opts?: { format?: "json" | null }
): string {
  const combined = {
    ...auth,
    v: API_VERSION,
    c: CLIENT_NAME,
    ...(opts?.format === null ? {} : { f: "json" }),
    ...Object.fromEntries(
      Object.entries(extra).map(([k, v]) => [k, String(v)])
    ),
  };

  return new URLSearchParams(combined).toString();
}

export function createNavidromeClient(config: NavidromeClientConfig) {
  const { serverUrl, username, password, defaultParams, basicAuth } = config;
  const baseUrl = serverUrl.replace(/\/+$/, "");
  const proxyHeader: Record<string, string> = basicAuth
    ? { Authorization: 'Basic ' + btoa(`${basicAuth.username}:${basicAuth.password}`) }
    : {};

  async function request<T>(
    endpoint: string,
    extraParams: Record<string, string | number> = {},
    options: { method?: "GET" | "POST" } = {}
  ): Promise<T> {
    const auth = buildTokenParams(username, password);
    const params = buildParams(auth, { ...(defaultParams ?? {}), ...extraParams });
    const url = `${baseUrl}/rest/${endpoint}?${params}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(url, { method: options.method ?? "GET", headers: proxyHeader, signal: controller.signal });
      if (!res.ok) {
        throw new Error(`Navidrome API error (${res.status}): ${await res.text()}`);
      }
      return res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function buildStreamUrl(songId: string, quality: AudioQuality = 'high'): string {
    const { format, maxBitRate } = qualityToStreamParams(quality);
    const auth = buildTokenParams(username, password);
    const extra: Record<string, string | number> = { id: songId, format };
    if (maxBitRate) extra.maxBitRate = maxBitRate;
    const params = buildParams(auth, extra, { format: null });
    return `${baseUrl}/rest/stream.view?${params}`;
  }

  return {
    request,
    buildStreamUrl,
    serverUrl: baseUrl,
    username,
    password,
  };
}
