import {
  Playlist,
  GenreListing,
  AlbumBase,
  Album,
  ArtistBase,
  Artist,
  Song,
  PlaylistBase,
} from "@/types";
import { AddSongToPlaylistResult } from "./navidrome/playlists/addSongToPlaylist";
import { RemoveSongFromPlaylistResult } from "./navidrome/playlists/removeSongFromPlaylist";

export type NavidromeAuthResult = {
  success: true;
  type: "navidrome";
};

export type JellyfinAuthResult = {
  success: true;
  type: "jellyfin";
  token: string;
  userId: string;
};

export type AuthFailure = {
  success: false;
  message?: string;
};

export type AuthResult =
  | NavidromeAuthResult
  | JellyfinAuthResult
  | AuthFailure;

export interface ApiAdapter {
  auth: AuthApi;
  albums: AlbumsApi;
  artists: ArtistsApi;
  genres: GenresApi;
  playlists: PlaylistsApi;
  starred: StarredApi;
  scrobble: ScrobbleApi;
  lyrics: LyricsApi;
}

export interface AuthApi {
  connect(
    serverUrl: string,
    username: string,
    password: string
  ): Promise<AuthResult>;
  ping(): Promise<boolean>;
  testUrl(url: string): Promise<{ success: boolean; message?: string }>;
  startScan(): Promise<{ success: boolean; message?: string }>;
  disconnect(): void;
}

export interface AlbumsApi {
  list(): Promise<AlbumBase[]>;
  get(id: string): Promise<Album>;
}

export interface ArtistsApi {
  list(): Promise<ArtistBase[]>;
  get(id: string): Promise<Artist>;
}

export interface GenresApi {
  list(): Promise<GenreListing[]>;
}

export interface PlaylistsApi {
  list(): Promise<PlaylistBase[]>;
  get(id: string): Promise<Playlist>;
  create(name: string): Promise<string>;
  addSong(playlistId: string, songId: string): Promise<AddSongToPlaylistResult>;
  removeSong(playlistId: string, songId: string): Promise<RemoveSongFromPlaylistResult>;
}

export interface StarredApi {
  list(): Promise<{
    songs: Song[];
  }>;
  add(id: string): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface ScrobbleApi {
  submit(songId: string): Promise<void>;
}

export interface LyricsApi {
  getBySongId(songId: string): Promise<LyricsResult | null>;
}

export type LyricLine = {
  startMs: number;
  text: string;
};

export type LyricsResult = {
  provider: "jellyfin" | "navidrome";
  synced: true;
  lines: LyricLine[];
};