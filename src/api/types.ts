import {
  Playlist,
  PlaylistBase,
  Album,
  AlbumBase,
  Artist,
  Song,
  SongBase,
} from "@/types";
import { AddSongToPlaylistResult } from "./navidrome/playlists/addSongToPlaylist";
import { RemoveSongFromPlaylistResult } from "./navidrome/playlists/removeSongFromPlaylist";
import type { AudioQuality, PreferredCodec } from '@/utils/redux/slices/settingsSlice';

export type Library = {
  id: string;
  name: string;
};


export interface SongsApi {
  get(id: string): Promise<Song | null>;
  scrobble(songId: string, timestamp: number): Promise<void>;
  buildStreamUrl(songId: string, quality: AudioQuality, codec?: PreferredCodec): string;
}

export interface TracksApi {
  list(): Promise<SongBase[]>;
  get(id: string): Promise<Song | null>;
}

export interface SimilarApi {
  getSimilarSongs(songId: string): Promise<Song[]>;
}

export interface ApiAdapter {
  auth: AuthApi;
  albums: AlbumsApi;
  artists: ArtistsApi;
  genres: GenresApi;
  playlists: PlaylistsApi;
  starred: StarredApi;
  songs: SongsApi;
  tracks: TracksApi;
  similar: SimilarApi;
  lyrics: LyricsApi;
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
  list(): Promise<AlbumBase[]>;
  get(id: string): Promise<Album>;
  /** Optional bulk fetch — returns all albums with songs in the fewest possible requests. */
  listWithSongs?(): Promise<Album[]>;
}

export interface ArtistsApi {
  list(): Promise<Artist[]>;
  get(id: string): Promise<Artist>;
}

export interface GenresApi {
  list(): Promise<string[]>;
}

export interface PlaylistsApi {
  list(): Promise<PlaylistBase[]>;
  get(id: string): Promise<Playlist>;
  create(name: string): Promise<string>;
  addSong(playlistId: string, songId: string): Promise<AddSongToPlaylistResult>;
  removeSong(playlistId: string, songId: string): Promise<RemoveSongFromPlaylistResult>;
  delete(id: string): Promise<void>;
}

export interface StarredApi {
  list(): Promise<{
    songs: Song[];
  }>;
  add(id: string): Promise<void>;
  remove(id: string): Promise<void>;
}

export interface LyricsApi {
  getBySongId(songId: string): Promise<LyricsResult | null>;
}

export type LyricLine = {
  startMs: number;
  text: string;
};

export type LyricsResult = {
  provider: "jellyfin" | "navidrome" | "emby";
  synced: true;
  lines: LyricLine[];
};

export type SearchApi = {
  search: (query: string) => Promise<{
    albums: AlbumBase[];
    artists: Artist[];
    songs: Song[];
  }>;
};
