import {
  ApiAdapter,
  AlbumsApi,
  ArtistsApi,
  GenresApi,
  PlaylistsApi,
  StarredApi,
  ScrobbleApi,
  StatsApi,
  SearchApi,
  AuthApi,
} from "../types";

import { AdapterType } from "@/types";

import { connect } from "./connect";
import { ping } from "./ping";
import { testServerUrl } from "./testServerUrl";
import { startScan } from "./startScan";
import { getAlbum } from "./getAlbum";
import { getAlbums } from "./getAlbums";
import { getArtists } from "./getArtists";
import { getArtistAlbums } from "./getArtistAlbums";
import { getPlaylists } from "./getPlaylists";
import { getPlaylistItems } from "./getPlaylistItems";
import { addPlaylistItems } from "./addPlaylistItems";
import { removePlaylistItems } from "./removePlaylistItems";
import { getStarredItems } from "./getStarredItems";
import { star } from "./star";
import { unstar } from "./unstar";
import { getSongsByGenre } from "./getSongsByGenre";

export const createJellyfinAdapter = (adapter: AdapterType): ApiAdapter => {
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
      const base = await getArtists(serverUrl, token);
      const artist = base.find((a) => a.id === id);
      if (!artist) throw new Error("Artist not found");
      const albums = await getArtistAlbums(serverUrl, token, id);
      return { ...artist, albums };
    },
  };

  const genres: GenresApi = {
    list: async () => {
      const names = [];
      return {
        songGenresMap: {},
        albumGenresMap: {},
        albumKeyGenresMap: {},
        fetchedGenres: names,
      };
    },
  };

  const playlists: PlaylistsApi = {
    list: async () => {
      return getPlaylists(serverUrl, userId, token);
    },
    create: async () => {
      throw new Error("Jellyfin playlists.create not implemented");
    },
    addSong: async (playlistId, songId) => {
      await addPlaylistItems(serverUrl, playlistId, userId, token, [songId]);
      return { success: true };
    },
    removeSong: async (playlistId, songId) => {
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

  const stats: StatsApi = {
    list: async () => {
      return {};
    },
  };

  const search: SearchApi = {
    all: async () => ({
      songs: [],
      albums: [],
      artists: [],
    }),
  };

  return {
    auth,
    albums,
    artists,
    genres,
    playlists,
    starred,
    scrobble,
    stats,
    search,
  };
};