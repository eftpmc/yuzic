import NavidromeIcon from '@assets/images/navidrome.png';
import JellyfinIcon from '@assets/images/jellyfin.png';

import { createNavidromeClient } from '@/api/navidrome/client';
import { ping as pingNavidrome } from '@/api/navidrome/auth/ping';
import { connect as connectNavidrome } from '@/api/navidrome/auth/connect';

import { createJellyfinClient } from '@/api/jellyfin/client';
import { ping as pingJellyfin } from '@/api/jellyfin/auth/ping';
import { connect as connectJellyfin } from '@/api/jellyfin/auth/connect';

import { ServerType } from '@/types';

export type ProviderAuth = {
  [key: string]: string | number | boolean | null;
};

export type ConnectResult = {
  success: boolean;
  message?: string;
  auth?: ProviderAuth;
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
    auth: ProviderAuth
  ) => Promise<boolean>;
  connect: (
    url: string,
    username: string,
    password: string
  ) => Promise<ConnectResult>;
  demo?: () => Promise<DemoResult>;
};

export const SERVER_PROVIDERS: Record<ServerType, ServerProviderConfig> = {
  navidrome: {
    type: 'navidrome',
    label: 'Navidrome',
    description: 'A lightweight, self-hosted music server.',
    icon: NavidromeIcon,
    capabilities: {
      supportsDemo: true,
    },
    ping: async (url, username, auth) => {
      const password = auth.password as string;
      if (!username || !password) return false;
      const client = createNavidromeClient({ serverUrl: url, username, password });
      return pingNavidrome(client);
    },
    connect: async (url, username, password) => {
      const result = await connectNavidrome(url, username, password);
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
      };
    },
    demo: async () => {
      const serverUrl = 'https://demo.navidrome.org';
      const username = 'demo';
      const password = 'demo';
      const result = await connectNavidrome(serverUrl, username, password);
      if (!result.success) {
        throw new Error(result.message || 'Demo connection failed');
      }
      return {
        serverUrl,
        username,
        auth: {
          password
        },
      };
    },
  },

  jellyfin: {
    type: 'jellyfin',
    label: 'Jellyfin',
    description: 'A full-featured media server for music, movies, and TV.',
    icon: JellyfinIcon,
    capabilities: {
      supportsDemo: false,
    },
    ping: async (url, username, auth) => {
      const token = auth.token as string;
      const userId = auth.userId as string;
      if (!token || !userId) return false;
      const client = createJellyfinClient({ serverUrl: url, token, userId });
      return pingJellyfin(client);
    },
    connect: async (url, username, password) => {
      const result = await connectJellyfin(url, username, password);
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