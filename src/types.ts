export interface AlbumData {
    id: string;
    cover: string;
    title: string;
    subtext: string;
    artist: ArtistData;
    userPlayCount: number;
    songs: SongData[]
    songCount: number;
}

export interface PlaylistData {
    id: string;
    cover: string;
    title: string;
    subtext: string;
    songs: SongData[]
    songCount: number;
}

export interface ArtistData {
    id: string;
    name: string;
    cover: string;
    subtext: string;
    bio: string;
    ownedIds: string[];
    externalAlbums: AlbumData[]
}

export interface SongData {
    id: string;
    title: string;
    artist: string;
    cover: string;
    duration: string;
    streamUrl: string;
    albumId: string;
    userPlayCount: number;
}
export interface GenreMaps {
    songGenresMap: Record<string, string[]>;
    albumGenresMap: Record<string, string[]>;
    albumKeyGenresMap: Record<string, string[]>;
    fetchedGenres: string[];
}

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