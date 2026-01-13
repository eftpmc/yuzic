import {
  ApiAdapter,
  AlbumsApi,
  ArtistsApi,
  GenresApi,
  PlaylistsApi,
  StarredApi,
  ScrobbleApi,
  AuthApi,
  LyricsApi
} from "../types";

import { Playlist, JellyfinServer } from "@/types";

import { connect } from "./auth/connect";
import { ping } from "./auth/ping";
import { testServerUrl } from "./auth/testServerUrl";
import { startScan } from "./auth/startScan";
import { getAlbum } from "./albums/getAlbum";
import { getAlbums } from "./albums/getAlbums";
import { getArtists } from "./artists/getArtists";
import { getPlaylists } from "./playlists/getPlaylists";
import { getPlaylistItems } from "./playlists/getPlaylistItems";
import { createPlaylist } from "./playlists/createPlaylist"
import { addPlaylistItems } from "./playlists/addPlaylistItems";
import { removePlaylistItems } from "./playlists/removePlaylistItems";
import { getStarredItems } from "./starred/getStarredItems";
import { star } from "./starred/star";
import { unstar } from "./starred/unstar";
import { getSongsByGenre } from "./genres/getSongsByGenre";
import { getArtist } from "./artists/getArtist";
import { getGenres } from "./genres/getGenres";
import { buildFavoritesPlaylist } from "@/utils/builders/buildFavoritesPlaylist";
import { FAVORITES_ID } from "@/constants/favorites";
import { getLyricsBySongId } from "./lyrics/getLyricsBySongId";

export const createJellyfinAdapter = (adapter: JellyfinServer): ApiAdapter => {
  const { serverUrl, username, password, token, userId } = adapter;

  const auth: AuthApi = {
    connect: async (serverUrl, username, password) => {
      return connect(serverUrl, username, password);
    },
    ping: async () => {
      if (!password) return false;
      return ping(serverUrl, password);
    },
    testUrl: async (url) => {
      return testServerUrl(url);
    },
    startScan: async () => {
      return startScan(serverUrl, password);
    },
    disconnect: () => { },
  };

  const albums: AlbumsApi = {
    list: async () => {
      return getAlbums(serverUrl, token);
    },
    get: async (id: string) => {
      const album = await getAlbum(serverUrl, token, id);
      if (!album) throw new Error("Album not found");
      return album;
    },
  };

  const artists: ArtistsApi = {
    list: async () => {
      return getArtists(serverUrl, token);
    },
    get: async (id: string) => {
      const artist = await getArtist(serverUrl, token, id);
      if (!artist) throw new Error("Album not found");
      return artist;
    },
  };

  const genres: GenresApi = {
    list: async () => {
      const names = await getGenres(serverUrl, token);

      const results = await Promise.all(
        names.map(async (name) => {
          const songs = await getSongsByGenre(
            serverUrl,
            token,
            name
          );

          return {
            name,
            songs,
          };
        })
      );

      return results.filter(g => g.songs.length > 0);
    },
  };

  const playlists: PlaylistsApi = {
    list: async () => {
      const [raw, starred] = await Promise.all([
        getPlaylists(serverUrl, userId, token),
        getStarredItems(serverUrl, userId, token),
      ]);

      const favorites = buildFavoritesPlaylist(starred.songs ?? []);

      const base = raw.map((p) => ({
        id: p.id,
        cover: p.cover,
        title: p.title,
        subtext: p.subtext,
      }));

      return [favorites, ...base];
    },

    get: async (id: string) => {
      if (id === FAVORITES_ID) {
        const starred = await getStarredItems(serverUrl, userId, token);
        return buildFavoritesPlaylist(starred.songs ?? []);
      }

      const basePlaylists = await getPlaylists(serverUrl, userId, token);
      const base = basePlaylists.find((p) => p.id === id);

      if (!base) {
        throw new Error("Playlist not found");
      }

      const songs = await getPlaylistItems(serverUrl, id, userId, token);

      return {
        id: base.id,
        cover: base.cover,
        title: base.title,
        subtext: `Playlist • ${songs.length} songs`,
        songs,
      } as Playlist;
    },

    create: async (name: string) => {
      return createPlaylist(serverUrl, userId, token, name);
    },

    addSong: async (playlistId: string, songId: string) => {
      if (playlistId === FAVORITES_ID) {
        await star(serverUrl, userId, token, songId);
        return { success: true };
      }

      await addPlaylistItems(serverUrl, playlistId, userId, token, [songId]);
      return { success: true };
    },

    removeSong: async (playlistId: string, songId: string) => {
      if (playlistId === FAVORITES_ID) {
        await unstar(serverUrl, userId, token, songId);
        return { success: true };
      }

      await removePlaylistItems(serverUrl, playlistId, token, [songId]);
      return { success: true };
    },
  };

  const starred: StarredApi = {
    list: async () => {
      return getStarredItems(serverUrl, userId, token);
    },
    add: async (id: string) => {
      await star(serverUrl, userId, token, id);
    },
    remove: async (id: string) => {
      await unstar(serverUrl, userId, token, id);
    },
  };

  const scrobble: ScrobbleApi = {
    submit: async (songId: string) => { },
  };

  const lyrics: LyricsApi = {
    getBySongId: async (songId) => {
      return getLyricsBySongId(serverUrl, token, songId);
    },
  };

  return {
    auth,
    albums,
    artists,
    genres,
    playlists,
    starred,
    scrobble,
    lyrics
  };
};