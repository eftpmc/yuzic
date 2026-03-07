import NavidromeIcon from '@assets/images/navidrome.png';
import JellyfinIcon from '@assets/images/jellyfin.png';

import { createNavidromeClient } from '@/api/navidrome/client';
import { ping as pingNavidrome } from '@/api/navidrome/auth/ping';
import { connect as connectNavidrome } from '@/api/navidrome/auth/connect';

import { createJellyfinClient } from '@/api/jellyfin/client';
import { ping as pingJellyfin } from '@/api/jellyfin/auth/ping';
import { connect as connectJellyfin } from '@/api/jellyfin/auth/connect';

import { ServerType } from '@/types';
import type { NavidromeLibrary } from '@/api/types';
import i18n from '@/i18n';

export type ProviderAuth = {
  [key: string]: string | number | boolean | null;
};

export type ConnectResult = {
  success: boolean;
  message?: string;
  auth?: ProviderAuth;
  libraries?: NavidromeLibrary[];
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
    get description() { return i18n.t('onboarding.connect.providerDescription.navidrome'); },
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
        libraries: result.libraries ?? [],
      };
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