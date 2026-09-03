export type ServerType = "navidrome" | "jellyfin" | "emby";

export type ProviderAuth = {
  [key: string]: string | number | boolean | null | string[];
};


export interface BasicAuth {
  username: string;
  password: string;
}

export interface Server {
  id: string;
  type: ServerType;
  /** Primary URL, always present. First entry probed on fresh sessions. */
  serverUrl: string;
  /**
   * Optional fallback URLs, tried in order when the primary fails —
   * e.g. a LAN address plus a Tailscale/domain that only works off-network
   * (issue #115). `serverUrl` itself is not repeated here.
   */
  fallbackUrls?: string[];
  username: string;
  auth?: ProviderAuth;
  basicAuth?: BasicAuth;
  isAuthenticated: boolean;
}