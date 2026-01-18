export type ServerType = "navidrome" | "jellyfin";

export type ProviderAuth = {
  [key: string]: string | number | boolean | null;
};

export interface Server {
  id: string;
  type: ServerType;
  serverUrl: string;
  username: string;
  auth?: ProviderAuth;
  isAuthenticated: boolean;
}