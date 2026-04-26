import NavidromeIcon from '@assets/images/navidrome.png';
import JellyfinIcon from '@assets/images/jellyfin.png';
import EmbyIcon from '@assets/images/emby.png';

import { createNavidromeClient, buildTokenParams } from '@/api/navidrome/client';
import { ping as pingNavidrome } from '@/api/navidrome/auth/ping';
import { connect as connectNavidrome } from '@/api/navidrome/auth/connect';
import { createNavidromeAdapter } from '@/api/navidrome';

import { createJellyfinClient } from '@/api/jellyfin/client';
import { ping as pingJellyfin } from '@/api/jellyfin/auth/ping';
import { connect as connectJellyfin } from '@/api/jellyfin/auth/connect';
import { createJellyfinAdapter } from '@/api/jellyfin';

import { createEmbyClient } from '@/api/emby/client';
import { ping as pingEmby } from '@/api/emby/auth/ping';
import { connect as connectEmby } from '@/api/emby/auth/connect';
import { createEmbyAdapter } from '@/api/emby';

import { ServerType, Server, CoverSource, BasicAuth } from '@/types';
import type { Library, ApiAdapter } from '@/api/types';
import i18n from '@/i18n';

export type { Library };

export type ProviderAuth = {
  [key: string]: string | number | boolean | null;
};

export type ConnectResult = {
  success: boolean;
  message?: string;
  auth?: ProviderAuth;
  libraries?: Library[];
};

export type DemoResult = {
  serverUrl: string;
  username: string;
  auth?: ProviderAuth;
};

export type ServerCapabilities = {
  supportsDemo: boolean;
};

export type ServerProviderConfig = {
  type: ServerType;
  label: string;
  description: string;
  icon: any;
  capabilities: ServerCapabilities;
  ping: (
    url: string,
    username: string,
    auth: ProviderAuth,
    basicAuth?: BasicAuth
  ) => Promise<boolean>;
  connect: (
    url: string,
    username: string,
    password: string,
    basicAuth?: BasicAuth
  ) => Promise<ConnectResult>;
  createAdapter: (server: Server) => ApiAdapter;
  buildCoverUrl: (server: Server, cover: CoverSource, px: number) => string | null;
  demo?: () => Promise<DemoResult>;
};

// Cache token params per credential key so cover URLs are stable across renders
// (expo-image caches by URL — a new random salt on every render = cache miss every time)
const coverTokenCache = new Map<string, { u: string; t: string; s: string }>();

function getCoverTokenParams(username: string, password: string) {
  const key = `${username}:${password}`;
  if (!coverTokenCache.has(key)) {
    coverTokenCache.set(key, buildTokenParams(username, password));
  }
  return coverTokenCache.get(key)!;
}

export const SERVER_PROVIDERS: Record<ServerType, ServerProviderConfig> = {
  navidrome: {
    type: 'navidrome',
    label: 'Navidrome',
    get description() { return i18n.t('onboarding.connect.providerDescription.navidrome'); },
    icon: NavidromeIcon,
    capabilities: {
      supportsDemo: true,
    },
    ping: async (url, username, auth, basicAuth) => {
      const password = auth.password as string;
      if (!username || !password) return false;
      const client = createNavidromeClient({ serverUrl: url, username, password, basicAuth });
      return pingNavidrome(client);
    },
    connect: async (url, username, password, basicAuth) => {
      const result = await connectNavidrome(url, username, password, basicAuth);
      if (!result.success) {
        return {
          success: false,
          message: result.message,
        };
      }
      return {
        success: true,
        username,
        auth: {
          password
        },
        libraries: result.libraries ?? [],
      };
    },
    createAdapter: (server) => createNavidromeAdapter(server),
    buildCoverUrl: (server, cover, px) => {
      if (cover.kind !== 'navidrome') return null;
      const password = server.auth?.password as string | undefined;
      if (!server.serverUrl || !server.username || !password) return null;
      const { u, t, s } = getCoverTokenParams(server.username, password);
      const params = new URLSearchParams({ id: cover.coverArtId, size: String(px), u, t, s, v: '1.16.0', c: 'Yuzic' });
      return `${server.serverUrl}/rest/getCoverArt.view?${params}`;
    },
    demo: async () => {
      const serverUrl = 'https://demo.navidrome.org';
      const username = 'demo';
      const password = 'demo';
      const result = await connectNavidrome(serverUrl, username, password);
      if (!result.success) {
        throw new Error(result.message || i18n.t('onboarding.connect.demoFailed'));
      }
      return {
        serverUrl,
        username,
        auth: {
          password,
          ...(result.libraries?.[0]?.id
            ? { musicFolderId: result.libraries[0].id }
            : {}),
        },
      };
    },
  },

  jellyfin: {
    type: 'jellyfin',
    label: 'Jellyfin',
    get description() { return i18n.t('onboarding.connect.providerDescription.jellyfin'); },
    icon: JellyfinIcon,
    capabilities: {
      supportsDemo: false,
    },
    ping: async (url, username, auth, basicAuth) => {
      const token = auth.token as string;
      const userId = auth.userId as string;
      if (!token || !userId) return false;
      const client = createJellyfinClient({ serverUrl: url, token, userId, basicAuth });
      return pingJellyfin(client);
    },
    connect: async (url, username, password, basicAuth) => {
      const result = await connectJellyfin(url, username, password, basicAuth);
      if (!result.success) {
        return {
          success: false,
          message: result.message,
        };
      }
      return {
        success: true,
        auth: {
          password,
          token: result.token,
          userId: result.userId,
        },
      };
    },
    createAdapter: (server) => createJellyfinAdapter(server),
    buildCoverUrl: (server, cover, px) => {
      if (cover.kind !== 'jellyfin') return null;
      const token = server.auth?.token as string | undefined;
      if (!server.serverUrl || !token) return null;
      const params = new URLSearchParams({ quality: '90', maxWidth: String(px), maxHeight: String(px), 'X-Emby-Token': token });
      return `${server.serverUrl}/Items/${cover.itemId}/Images/Primary?${params}`;
    },
  },

  emby: {
    type: 'emby',
    label: 'Emby',
    get description() { return i18n.t('onboarding.connect.providerDescription.emby'); },
    icon: EmbyIcon,
    capabilities: {
      supportsDemo: false,
    },
    ping: async (url, username, auth, basicAuth) => {
      const token = auth.token as string;
      const userId = auth.userId as string;
      if (!token || !userId) return false;
      const client = createEmbyClient({ serverUrl: url, token, userId, basicAuth });
      return pingEmby(client);
    },
    connect: async (url, username, password, basicAuth) => {
      const result = await connectEmby(url, username, password, basicAuth);
      if (!result.success) {
        return {
          success: false,
          message: result.message,
        };
      }
      return {
        success: true,
        auth: {
          password,
          token: result.token,
          userId: result.userId,
        },
      };
    },
    createAdapter: (server) => createEmbyAdapter(server),
    buildCoverUrl: (server, cover, px) => {
      if (cover.kind !== 'emby') return null;
      const token = server.auth?.token as string | undefined;
      if (!server.serverUrl || !token) return null;
      const baseUrl = server.serverUrl.replace(/\/$/, '');
      const paramObj: Record<string, string> = { quality: '90', maxWidth: String(px), maxHeight: String(px), api_key: token };
      if (cover.tag) paramObj.tag = cover.tag;
      const params = new URLSearchParams(paramObj);
      return `${baseUrl}/Items/${cover.itemId}/Images/Primary?${params}`;
    },
  },
};

export const getServerProvider = (type: ServerType) => {
  const provider = SERVER_PROVIDERS[type];
  if (!provider) {
    throw new Error(`Unknown server provider: ${type}`);
  }
  return provider;
};

export const getAllServerProviders = () =>
  Object.values(SERVER_PROVIDERS);

export const supportsDemo = (type: ServerType) =>
  SERVER_PROVIDERS[type]?.capabilities.supportsDemo ?? false;
