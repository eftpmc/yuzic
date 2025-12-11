export interface AlbumData {
    id: string;
    cover: string;
    title: string;
    subtext: string;
    artist: ArtistData;
    songs: SongData[];
    musicBrainzId?: string | null;
    lastFmUrl?: string | null;
    genres?: string[];
    userPlayCount?: number;
}

export interface PlaylistData {
    id: string;
    cover: string;
    title: string;
    subtext: string;
    songs: SongData[];
}

export interface ArtistData {
    id: string;
    name: string;
    cover: string;
    subtext?: string;
    bio?: string;
    albums?: AlbumSummary[];
    eps?: AlbumSummary[];
    singles?: AlbumSummary[];
}

export interface SongData {
    id: string;
    title: string;
    artist: string;
    cover: string;
    duration: string;
    streamUrl?: string;
    albumId?: string;
    genres?: string[]
    globalPlayCount: number | null;
    userPlayCount: number;
}
export interface GenreMaps {
    songGenresMap: Record<string, string[]>;
    albumGenresMap: Record<string, string[]>;
    albumKeyGenresMap: Record<string, string[]>;
    fetchedGenres: string[];
}


export interface AlbumSummary {
    id: string;
    cover: string;
    title: string;
    subtext: string;
    artist: string;
    playcount?: number;
    isDownloaded?: boolean;
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