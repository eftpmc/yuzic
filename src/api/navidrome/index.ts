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
  AuthApi
} from "../types";

import { GenreMaps, AdapterType, Song } from "@/types";

import { connect } from "./auth/connect";
import { ping } from "./auth/ping";
import { testServerUrl } from "./auth/testServerUrl";
import { startScan } from "./auth/startScan";
import { disconnect } from "@/utils/redux/slices/serverSlice";

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

export const createNavidromeAdapter = (adapter: AdapterType): ApiAdapter => {
  const { serverUrl, username, password } = adapter;

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

      const maps: GenreMaps = {
        songGenresMap: {},
        albumGenresMap: {},
        albumKeyGenresMap: {},
        fetchedGenres: names,
      };

      for (const genre of names) {
        const songs = await getSongsByGenre(serverUrl, username, password, genre);

        for (const s of songs) {
          if (!maps.songGenresMap[s.id]) maps.songGenresMap[s.id] = [];
          maps.songGenresMap[s.id].push(genre);

          if (s.albumId) {
            if (!maps.albumGenresMap[s.albumId]) maps.albumGenresMap[s.albumId] = [];
            maps.albumGenresMap[s.albumId].push(genre);
          }
        }
      }

      return maps;
    },
  };
  const playlists: PlaylistsApi = {
    list: async () => {
      return getPlaylists(serverUrl, username, password);
    },

    get: async (id: string) => {
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
      return addSongToPlaylist(serverUrl, username, password, playlistId, songId);
    },

    removeSong: async (playlistId, songId) => {
      const playlist = await getPlaylist(serverUrl, username, password, playlistId);
      if (!playlist) throw new Error("Playlist not found");

      const index = playlist.songs.findIndex((s: Song) => s.id === songId);
      if (index === -1) {
        throw new Error("Song not found in playlist");
      }

      return removeSongFromPlaylist(
        serverUrl,
        username,
        password,
        playlistId,
        index
      );
    },
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