import {
    AlbumData,
    ArtistData,
    PlaylistData,
    SongData,
    GenreMaps,
} from "@/types";
import { AddSongToPlaylistResult } from "./navidrome/playlists/addSongToPlaylist";
import { RemoveSongFromPlaylistResult } from "./navidrome/playlists/removeSongFromPlaylist";

export interface ApiAdapter {
    auth: AuthApi;
    albums: AlbumsApi;
    artists: ArtistsApi;
    genres: GenresApi;
    playlists: PlaylistsApi;
    starred: StarredApi;
    scrobble: ScrobbleApi;
    stats: StatsApi;
    search: SearchApi;
}

export interface AuthApi {
  connect(
    serverUrl: string,
    username: string,
    password: string
  ): Promise<{ success: boolean; message?: string }>;
  ping(): Promise<boolean>;
  testUrl(url: string): Promise<{ success: boolean; message?: string }>;
  startScan(): Promise<{ success: boolean; message?: string }>;
  disconnect(): void;
}

export interface AlbumsApi {
    list(): Promise<AlbumData[]>;
    get(id: string): Promise<AlbumData>;
}

export interface ArtistsApi {
    list(): Promise<ArtistData[]>;
    get(id: string): Promise<ArtistData>;
}

export interface GenresApi {
    list(): Promise<GenreMaps>;
}

export interface PlaylistsApi {
  list(): Promise<PlaylistData[]>;
  get(id: string): Promise<PlaylistData>;
  create(name: string): Promise<string>;
  addSong(playlistId: string, songId: string): Promise<AddSongToPlaylistResult>;
  removeSong(playlistId: string, songId: string): Promise<RemoveSongFromPlaylistResult>;
}

export interface StarredApi {
    list(): Promise<{
        albumIds: string[];
        artistIds: string[];
        songIds: string[];
    }>;
    add(id: string): Promise<void>;
    remove(id: string): Promise<void>;
}

export interface ScrobbleApi {
    submit(songId: string): Promise<void>;
}

export interface StatsApi {
    list(): Promise<Record<string, number>>;
}

export interface SearchApi {
    all(query: string): Promise<{
        songs: SongData[];
        albums: AlbumData[];
        artists: ArtistData[];
    }>;
}