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
    isLoading: boolean;
    serverUrl: string;
    username: string;
    password: string;
    isAuthenticated: boolean;
  
    connectToServer: (localUsername: string, localPassword: string) => Promise<{ success: boolean; message?: string }>;
    pingServer: () => Promise<boolean>;
    testServerUrl: (url: string) => Promise<{ success: boolean; message?: string }>;
    startScan?: () => Promise<{ success: boolean; message?: string }>;
    disconnect: () => void;
    setServerUrl: (url: string) => void;
    setUsername: (user: string) => void;
    setPassword: (pass: string) => void;
    getLibraries?: () => Promise<any[]>;
  }  
  