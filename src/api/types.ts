import {
  Playlist,
  PlaylistBase,
  Album,
  AlbumBase,
  Artist,
  ExternalArtistBase,
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
  /**
   * Session playback reporting for servers that scrobble on the strength of it
   * (Jellyfin / Emby's Last.fm plugin reads these events, not scrobble.view or
   * PlayedItems). Optional — Navidrome's Subsonic path already forwards to
   * Last.fm through scrobble() and doesn't need session pings.
   */
  reportPlaybackStart?(songId: string, positionMs: number): Promise<void>;
  reportPlaybackProgress?(songId: string, positionMs: number, isPaused: boolean): Promise<void>;
  reportPlaybackStop?(songId: string, positionMs: number): Promise<void>;
}

export interface TracksApi {
  list(): Promise<SongBase[]>;
  get(id: string): Promise<Song | null>;
}

export interface SimilarApi {
  getSimilarSongs(songId: string): Promise<Song[]>;
  /**
   * Similar artists from the server's own metadata graph — Navidrome pulls
   * these from Last.fm server-side (getArtistInfo2), Jellyfin/Emby from
   * their tag graph (/Items/{id}/Similar). Distinct from the app's
   * Deezer/Last.fm/AudioMuse sources: users on a server without those
   * integrations still get similar-artists. Uses ExternalArtistBase for
   * the same reason Deezer/Last.fm do — the record needs just enough to
   * navigate and tile, and the caller uses matched-navigation to resolve
   * an id that already lives in the local library when it does.
   */
  getSimilarArtists?(artistId: string, limit?: number): Promise<ExternalArtistBase[]>;
  getSimilarAlbums?(albumId: string, limit?: number): Promise<AlbumBase[]>;
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
  /**
   * User-managed internet radio stations. Only implemented for servers that
   * expose it (Subsonic/Navidrome); UI checks presence rather than provider
   * name so a future adapter can opt in without touching the caller.
   */
  radio?: RadioApi;
  /** Public shareable URLs for albums/playlists/tracks (Subsonic shares). */
  shares?: SharesApi;
}

export type InternetRadioStation = {
  id: string;
  name: string;
  streamUrl: string;
  homepageUrl?: string;
};

export interface RadioApi {
  list(): Promise<InternetRadioStation[]>;
  create(input: { name: string; streamUrl: string; homepageUrl?: string }): Promise<void>;
  update(input: { id: string; name: string; streamUrl: string; homepageUrl?: string }): Promise<void>;
  remove(id: string): Promise<void>;
}

export type Share = {
  id: string;
  url: string;
  description?: string;
  created?: string;
  expires?: string;
  visitCount?: number;
};

export interface SharesApi {
  list(): Promise<Share[]>;
  /** Creates a public share URL for an album/playlist/track id and returns
   * the created record. Nullable so callers can toast an error instead of
   * throwing — the URL is what they actually need. */
  create(input: { itemId: string; description?: string; expiresAtMs?: number | null }): Promise<Share | null>;
  update(input: { id: string; description?: string; expiresAtMs?: number | null }): Promise<void>;
  remove(id: string): Promise<void>;
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
  rename(id: string, newName: string): Promise<void>;
  addSong(playlistId: string, songId: string): Promise<AddSongToPlaylistResult>;
  removeSong(playlistId: string, songId: string): Promise<RemoveSongFromPlaylistResult>;
  delete(id: string): Promise<void>;
}

export type StarredItemType = 'song' | 'album';

export interface StarredApi {
  list(): Promise<{
    songs: Song[];
    albums: AlbumBase[];
  }>;
  add(id: string, type?: StarredItemType): Promise<void>;
  remove(id: string, type?: StarredItemType): Promise<void>;
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
