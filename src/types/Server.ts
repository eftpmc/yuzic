export type ServerType = "navidrome" | "jellyfin";

interface BaseServer {
  id: string;
  type: ServerType;
  serverUrl: string;
  username: string;
  password: string;
  isAuthenticated: boolean;
}

export interface NavidromeServer extends BaseServer {
  type: "navidrome";
}

export interface JellyfinServer extends BaseServer {
  type: "jellyfin";
  token: string;
  userId: string;
}

export type Server = NavidromeServer | JellyfinServer;