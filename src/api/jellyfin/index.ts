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

import { AdapterType, PlaylistData } from "@/types";

import { connect } from "./auth/connect";
import { ping } from "./auth/ping";
import { testServerUrl } from "./auth/testServerUrl";
import { startScan } from "./auth/startScan";
import { getAlbum } from "./albums/getAlbum";
import { getAlbums } from "./albums/getAlbums";
import { getArtists } from "./artists/getArtists";
import { getArtistAlbums } from "./albums/getArtistAlbums";
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
      const artist = await getArtist(serverUrl, token, id);
      if (!artist) throw new Error("Album not found");
      return artist;
    },
  };

  const genres: GenresApi = {
    list: async () => {
      const names: string[] = [];
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
      const raw = await getPlaylists(serverUrl, userId, token);

      const hydrated = await Promise.allSettled(
        raw.map(async (p) => {
          try {
            const songs = await getPlaylistItems(serverUrl, p.id, userId, token);
            return {
              ...p,
              songs,
              subtext: `Playlist • ${songs.length} songs`,
            };
          } catch (error) {
            console.warn(`Failed to fetch items for playlist ${p.id}:`, error);
            return p;
          }
        })
      );

      return hydrated
        .filter((result): result is PromiseFulfilledResult<PlaylistData> =>
          result.status === 'fulfilled'
        )
        .map(result => result.value);
    },

    get: async (id: string) => {
      const base = await playlists.list();
      const playlist = base.find((p) => p.id === id);
      if (!playlist) throw new Error("Artist not found");
      return playlist;
    },

    create: async (name) => {
      return createPlaylist(serverUrl, userId, token, name)
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