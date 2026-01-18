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
import { FAVORITES_ID } from '@/constants/favorites';
import { buildFavoritesPlaylist } from '@/utils/builders/buildFavoritesPlaylist';

import { Song, Server } from "@/types";

import { connect } from "./auth/connect";
import { ping } from "./auth/ping";
import { testServerUrl } from "./auth/testServerUrl";
import { startScan } from "./auth/startScan";

import { getAlbum } from "./albums/getAlbum";
import { getAlbumList } from "./albums/getAlbumList";

import { getArtist } from "./artists/getArtist";
import { getArtists } from "./artists/getArtists";

import { getPlaylists } from "./playlists/getPlaylists";
import { getPlaylist } from "./playlists/getPlaylist";
import { createPlaylist } from "./playlists/createPlaylist";
import { addSongToPlaylist } from "./playlists/addSongToPlaylist";
import { removeSongFromPlaylist } from "./playlists/removeSongFromPlaylist";

import { getStarredItems } from "./starred/getStarredItems";
import { star } from "./starred/star";
import { unstar } from "./starred/unstar";

import { getSongsByGenre } from "./genres/getSongsByGenre";
import { getGenres } from "./genres/getGenres";

import { scrobbleTrack } from "./scrobbleTrack";

import { getLyricsBySongId } from "./lyrics/getLyricsBySongId";

export const createNavidromeAdapter = (server: Server): ApiAdapter => {
  const { serverUrl, username, auth: providerAuth } = server;
  const password = providerAuth?.password as string;

  const auth: AuthApi = {
    connect: (serverUrl, username, password) => connect(serverUrl, username, password),
    ping: () => ping(serverUrl, username, password),
    testUrl: (url) => testServerUrl(url),
    startScan: () => startScan(serverUrl, username, password),
    disconnect: () => { },
  };

  const albums: AlbumsApi = {
    list: async () => {
      return getAlbumList(serverUrl, username, password);
    },

    get: async (id: string) => {
      const full = await getAlbum(serverUrl, username, password, id);
      if (!full) throw new Error("Album not found");
      return full;
    }
  };

  const artists: ArtistsApi = {
    list: async () => {
      return getArtists(serverUrl, username, password);
    },

    get: async (id: string) => {
      const artist = await getArtist(serverUrl, username, password, id);
      if (!artist) throw new Error("Artist not found");
      return artist;
    },
  };

  const genres: GenresApi = {
    list: async () => {
      const names = await getGenres(serverUrl, username, password);

      const results = await Promise.all(
        names.map(async (name) => {
          const songs = await getSongsByGenre(
            serverUrl,
            username,
            password,
            name,
            500
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
      const [playlists, starred] = await Promise.all([
        getPlaylists(serverUrl, username, password),
        getStarredItems(serverUrl, username, password),
      ]);

      const favorites = buildFavoritesPlaylist(starred.songs ?? []);
      return [favorites, ...playlists];
    },

    get: async (id: string) => {
      if (id === FAVORITES_ID) {
        const starred = await getStarredItems(serverUrl, username, password);
        return buildFavoritesPlaylist(starred.songs ?? []);
      }

      const playlist = await getPlaylist(serverUrl, username, password, id);
      if (!playlist) throw new Error("Playlist not found");
      return playlist;
    },


    create: async (name: string) => {
      const res = await createPlaylist(serverUrl, username, password, name);
      if (!res.id) throw new Error("Failed to create playlist");
      return res.id;
    },

    addSong: async (playlistId, songId) => {
      if (playlistId === FAVORITES_ID) {
        await star(serverUrl, username, password, songId);
        return { success: true };
      }
      return addSongToPlaylist(serverUrl, username, password, playlistId, songId);
    },

    removeSong: async (playlistId, songId) => {
      if (playlistId === FAVORITES_ID) {
        await unstar(serverUrl, username, password, songId);
        return { success: true };
      }

      const playlist = await getPlaylist(serverUrl, username, password, playlistId);
      if (!playlist) throw new Error("Playlist not found");

      const index = playlist.songs.findIndex((s: Song) => s.id === songId);
      if (index === -1) throw new Error("Song not found in playlist");

      return removeSongFromPlaylist(
        serverUrl,
        username,
        password,
        playlistId,
        index.toString()
      );
    }
  };

  const starred: StarredApi = {
    list: async () => getStarredItems(serverUrl, username, password),

    add: async (id) => {
      await star(serverUrl, username, password, id);
    },

    remove: async (id) => {
      await unstar(serverUrl, username, password, id);
    },
  };

  const scrobble: ScrobbleApi = {
    submit: async (songId) => {
      await scrobbleTrack(serverUrl, username, password, songId);
    },
  };

  const lyrics: LyricsApi = {
    getBySongId: async (songId) => {
      return getLyricsBySongId(serverUrl, username, password, songId);
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