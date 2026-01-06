export interface AlbumBase {
    id: string;
    cover: CoverSource;
    title: string;
    subtext: string;
    artist: ArtistBase;
    userPlayCount: number;
}

export interface Album extends AlbumBase {
    songs: Song[]
}

export interface PlaylistBase {
    id: string;
    cover: CoverSource;
    title: string;
    subtext: string;
}

export interface Playlist extends PlaylistBase {
    songs: Song[]
}

export interface ArtistBase {
    id: string;
    cover: CoverSource;
    name: string;
    subtext: string;
}

export interface Artist extends ArtistBase {
    bio: string;
    lastfmurl: string;
    ownedAlbums: AlbumBase[];
    externalAlbums: AlbumBase[];
}

export interface Song {
    id: string;
    title: string;
    artist: string;
    cover: CoverSource;
    duration: string;
    streamUrl: string;
    albumId: string;
    userPlayCount: number;
}

export type GenreListing = {
  name: string;
  songs: Song[];
};

export interface ServerContextType {
    serverType: 'navidrome' | 'jellyfin' | 'none';
    serverUrl: string;
    username: string;
    password: string;
    token?: string | null;
}

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

export type CoverSource =
  | { kind: 'special'; name: 'heart' }
  | { kind: 'none' }
  | { kind: 'navidrome'; coverArtId: string }
  | { kind: 'jellyfin'; itemId: string; imageType?: 'Primary' | 'Backdrop'; tag?: string };

  export const COVER_PX: Record<'thumb' | 'grid' | 'detail' | 'background', number> = {
  thumb: 96,
  grid: 420,
  detail: 1200,
  background: 1800,
};