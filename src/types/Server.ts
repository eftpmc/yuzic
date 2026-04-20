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
  serverUrl: string;
  username: string;
  auth?: ProviderAuth;
  basicAuth?: BasicAuth;
  isAuthenticated: boolean;
}