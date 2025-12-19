export interface AlbumBase {
    id: string;
    cover: string;
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
    cover: string;
    title: string;
    subtext: string;
}

export interface Playlist {
    id: string;
    cover: string;
    title: string;
    subtext: string;
    songs: Song[]
}

export interface ArtistBase {
    id: string;
    cover: string;
    name: string;
    subtext: string;
}

export interface Artist extends ArtistBase {
    bio: string;
    ownedAlbums: AlbumBase[];
    externalAlbums: AlbumBase[];
}

export interface Song {
    id: string;
    title: string;
    artist: string;
    cover: string;
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

export interface AdapterType {
    serverUrl: string;
    username: string;
    password: string;
    token: string;
    userId: string;
}