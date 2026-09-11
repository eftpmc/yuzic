import NavidromeIcon from '@assets/images/navidrome.png';
import JellyfinIcon from '@assets/images/jellyfin.png';
import EmbyIcon from '@assets/images/emby.png';
import PlexIcon from '@assets/images/plex.png';
import LocalFilesIcon from '@assets/images/local-files.png';

import { createNavidromeClient, buildTokenParams } from '@/api/navidrome/client';
import { ping as pingNavidrome } from '@/api/navidrome/auth/ping';
import { connect as connectNavidrome } from '@/api/navidrome/auth/connect';
import { createNavidromeAdapter } from '@/api/navidrome';

import { createJellyfinClient } from '@/api/jellyfin/client';
import { createJellyfinAdapter } from '@/api/jellyfin';
import {
  initiateQuickConnect,
  pollQuickConnect,
  authenticateWithQuickConnect,
} from '@/api/jellyfin/auth/quickConnect';

import { createEmbyClient } from '@/api/emby/client';
import { createEmbyAdapter } from '@/api/emby';

import { createPlexClient } from '@/api/plex/client';
import { createPlexAdapter } from '@/api/plex';
import { beginPlexPin, pollPlexPin } from '@/api/plex/auth/pin';
import { createLocalAdapter } from '@/api/local';

import { getMusicFolders } from '@/api/navidrome/auth/getMusicFolders';
import { getMusicLibraries } from '@/api/mediaBrowser/auth/getMusicLibraries';

import { ping as pingMediaBrowser } from '@/api/mediaBrowser/auth/ping';
import { connect as connectMediaBrowser } from '@/api/mediaBrowser/auth/connect';
import { JELLYFIN_BRAND, EMBY_BRAND } from '@/api/mediaBrowser/brand';

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

/**
 * Where a provider keeps the user's chosen library ids inside `server.auth`.
 *
 * Subsonic scopes a request by `musicFolderId`, MediaBrowser by `parentId`, and
 * both were once written as a single id before multi-select existed — so each
 * provider names the array key it writes now and the singular key an upgrading
 * install may still be carrying. Callers read and write the selection through
 * `selectedLibraryIds` / `libraryScopePatch` rather than knowing either name.
 */
export type LibraryScope = {
  key: string;
  legacyKey: string;
};

/**
 * Signing in by showing the user a code instead of asking for a password.
 *
 * Jellyfin calls it Quick Connect and Plex calls it a PIN, but the shape is
 * the same on both: begin the attempt and get back a code to display, poll
 * until the user approves it elsewhere, and receive the credentials. The
 * differences that remain — where the user types the code, how long it lives,
 * what the poll returns — are data the provider supplies rather than branches
 * the screen takes.
 *
 * This exists because the onboarding screen used to import Jellyfin's Quick
 * Connect directly and gate it on `type === 'jellyfin'`. That is the
 * provider-name branching the adapter layer bans, sitting one layer up where
 * the rule had never been applied, and adding a second provider with the same
 * flow would have meant a second branch beside it.
 *
 * A provider that has no such flow leaves `codeAuth` undefined and the option
 * does not render — the same presence-gating every optional capability uses.
 */
export type CodeAuthApi = {
  /**
   * Start an attempt. Returns the code to show the user plus an opaque handle
   * the poll takes back.
   *
   * `handle` is deliberately opaque: Jellyfin's is a secret string, Plex's is
   * a pin id paired with its code, and the screen should be able to hold
   * either without knowing which it has.
   */
  begin(input: { serverUrl: string; basicAuth?: BasicAuth }): Promise<{
    code: string;
    handle: unknown;
  }>;
  /**
   * One poll. Resolves to the finished auth once the user has approved, or
   * null while still waiting.
   *
   * Returning null rather than throwing matters: "not yet" is the expected
   * answer for most of this call's life, and a screen that had to tell a
   * pending poll apart from a failed one by catching would get it wrong.
   */
  poll(input: {
    serverUrl: string;
    handle: unknown;
    basicAuth?: BasicAuth;
  }): Promise<{ auth: ProviderAuth; username: string } | null>;
  /** How often to poll, in milliseconds. */
  pollIntervalMs: number;
  /**
   * How long to keep polling before giving up. Both providers expire the code
   * server-side; without a client ceiling the screen would sit on "waiting for
   * approval" forever with nothing indicating the code had gone stale.
   */
  timeoutMs: number;
  /**
   * i18n key for the instruction telling the user where to enter the code.
   * A key rather than a string because this renders in the UI, and the
   * sentences it replaced were hardcoded English no locale could translate.
   */
  instructionKey: string;
  /** i18n key for the row that starts the flow. */
  actionKey: string;
};

export type ServerProviderConfig = {
  type: ServerType;
  label: string;
  description: string;
  icon: any;
  capabilities: ServerCapabilities;
  libraryScope: LibraryScope;
  /** The libraries/folders this server offers to scope the app to. */
  listLibraries: (server: Server) => Promise<Library[]>;
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
  /** Sign in by code instead of password, where the provider offers it. */
  codeAuth?: CodeAuthApi;
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
    libraryScope: { key: 'musicFolderIds', legacyKey: 'musicFolderId' },
    listLibraries: (server) => getMusicFolders(server),
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
    libraryScope: { key: 'parentIds', legacyKey: 'parentId' },
    listLibraries: (server) => getMusicLibraries(server),
    ping: async (url, username, auth, basicAuth) => {
      const token = auth.token as string;
      const userId = auth.userId as string;
      if (!token || !userId) return false;
      const client = createJellyfinClient({ serverUrl: url, token, userId, basicAuth });
      return pingMediaBrowser(client);
    },
    connect: async (url, username, password, basicAuth) => {
      const result = await connectMediaBrowser(JELLYFIN_BRAND, url, username, password, basicAuth);
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
    codeAuth: {
      begin: async ({ serverUrl, basicAuth }) => {
        const { secret, code } = await initiateQuickConnect(serverUrl, basicAuth);
        return { code, handle: secret };
      },
      poll: async ({ serverUrl, handle, basicAuth }) => {
        const secret = handle as string;
        const authenticated = await pollQuickConnect(serverUrl, secret, basicAuth);
        if (!authenticated) return null;

        const { token, userId, username } = await authenticateWithQuickConnect(
          serverUrl,
          secret,
          basicAuth
        );
        return { auth: { token, userId }, username };
      },
      pollIntervalMs: 3000,
      timeoutMs: 10 * 60 * 1000,
      instructionKey: 'onboarding.credentials.codeAuth.jellyfin.instruction',
      actionKey: 'onboarding.credentials.codeAuth.jellyfin.action',
    },
    buildCoverUrl: (server, cover, px) => {
      if (cover.kind !== 'jellyfin') return null;
      const token = server.auth?.token as string | undefined;
      if (!server.serverUrl || !token) return null;
      const params = new URLSearchParams({ quality: '90', maxWidth: String(px), maxHeight: String(px), 'X-Emby-Token': token });
      return `${server.serverUrl}/Items/${cover.itemId}/Images/Primary?${params}`;
    },
  },

  plex: {
    type: 'plex',
    label: 'Plex',
    get description() { return i18n.t('onboarding.connect.providerDescription.plex'); },
    icon: PlexIcon,
    capabilities: { supportsDemo: false },
    libraryScope: { key: 'sectionIds', legacyKey: 'sectionId' },
    listLibraries: async (server) => {
      const token = server.auth?.token as string | undefined;
      const client = createPlexClient({ serverUrl: server.serverUrl, token, basicAuth: server.basicAuth });
      const response = await client.request<any>('/library/sections');
      return (response.MediaContainer?.Directory ?? [])
        .filter((section: any) => section.type === 'artist')
        .map((section: any) => ({ id: String(section.key), name: section.title ?? 'Music' }));
    },
    ping: async (url, _username, auth, basicAuth) => {
      const token = auth.token as string | undefined;
      if (!token) return false;
      try {
        await createPlexClient({ serverUrl: url, token, basicAuth }).request('/identity');
        return true;
      } catch { return false; }
    },
    // Plex’s account token comes from PIN authorization. Keeping password auth
    // explicitly unavailable is safer than silently sending a password to an
    // endpoint Plex does not use.
    connect: async () => ({ success: false, message: i18n.t('onboarding.credentials.codeAuth.plex.useCode') }),
    createAdapter: (server) => createPlexAdapter(server),
    codeAuth: {
      begin: async ({ serverUrl, basicAuth }) => beginPlexPin(serverUrl, basicAuth),
      poll: async ({ serverUrl, handle, basicAuth }) => pollPlexPin(String(handle), serverUrl, basicAuth),
      pollIntervalMs: 2000,
      timeoutMs: 10 * 60 * 1000,
      instructionKey: 'onboarding.credentials.codeAuth.plex.instruction',
      actionKey: 'onboarding.credentials.codeAuth.plex.action',
    },
    buildCoverUrl: (server, cover) => {
      if (cover.kind !== 'plex' || !server.serverUrl) return null;
      const token = server.auth?.token as string | undefined;
      return createPlexClient({ serverUrl: server.serverUrl, token, basicAuth: server.basicAuth }).buildImageUrl(cover.path);
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
    libraryScope: { key: 'parentIds', legacyKey: 'parentId' },
    listLibraries: (server) => getMusicLibraries(server),
    ping: async (url, username, auth, basicAuth) => {
      const token = auth.token as string;
      const userId = auth.userId as string;
      if (!token || !userId) return false;
      const client = createEmbyClient({ serverUrl: url, token, userId, basicAuth });
      return pingMediaBrowser(client);
    },
    connect: async (url, username, password, basicAuth) => {
      const result = await connectMediaBrowser(EMBY_BRAND, url, username, password, basicAuth);
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

  local: {
    type: 'local',
    label: 'Local files',
    get description() { return i18n.t('onboarding.connect.providerDescription.local'); },
    icon: LocalFilesIcon,
    capabilities: { supportsDemo: false },
    libraryScope: { key: 'localLibraryIds', legacyKey: 'localLibraryId' },
    listLibraries: async () => [{ id: 'device', name: i18n.t('onboarding.local.libraryName') }],
    ping: async () => true,
    connect: async () => ({ success: true, auth: {} }),
    createAdapter: (server) => createLocalAdapter(server),
    buildCoverUrl: (_server, cover) => cover.kind === 'url' ? cover.url : null,
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

/** The libraries this server offers, asked of it without knowing its type. */
export const listServerLibraries = (server: Server): Promise<Library[]> =>
  getServerProvider(server.type).listLibraries(server);

/**
 * The library ids currently selected, empty meaning "all". Reads the provider's
 * own key, falling back to the pre-multi-select singular one so a server
 * configured before that change keeps its scope.
 */
export const selectedLibraryIds = (server: Server): string[] => {
  const { key, legacyKey } = getServerProvider(server.type).libraryScope;
  const current = server.auth?.[key];
  if (Array.isArray(current)) return current as string[];
  const legacy = server.auth?.[legacyKey];
  return legacy ? [String(legacy)] : [];
};

/** The `auth` patch that stores a new selection for this server. */
export const libraryScopePatch = (
  server: Server,
  ids: string[]
): Record<string, string[]> => ({
  [getServerProvider(server.type).libraryScope.key]: ids,
});
