import {
  ApiAdapter,
  AlbumsApi,
  ArtistsApi,
  GenresApi,
  PlaylistsApi,
  StarredApi,
  SimilarApi,
  SongsApi,
  AuthApi,
  LyricsApi,
  SearchApi
} from "../types";
import { FAVORITES_ID } from "@/constants/favorites";
import { buildFavoritesPlaylist } from "@/utils/builders/buildFavoritesPlaylist";

import { Song, Server } from "@/types";

import { createNavidromeClient } from "./client";
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
import { deletePlaylist } from "./playlists/deletePlaylist";
import { addSongToPlaylist } from "./playlists/addSongToPlaylist";
import { removeSongFromPlaylist } from "./playlists/removeSongFromPlaylist";

import { getStarredItems } from "./starred/getStarredItems";
import { star } from "./starred/star";
import { unstar } from "./starred/unstar";

import { getGenres } from "./genres/getGenres";

import { getLyricsBySongId } from "./lyrics/getLyricsBySongId";
import { getSong } from "./songs/getSong";
import { getSimilarSongs } from "./similar/getSimilarSongs";

import { search as searchNavidrome } from "./search/search";

export const createNavidromeAdapter = (server: Server): ApiAdapter => {
  const { serverUrl, username, auth: providerAuth } = server;
  const password = providerAuth?.password as string;
  const client = createNavidromeClient({ serverUrl, username, password });

  const auth: AuthApi = {
    connect: (serverUrl, username, password) =>
      connect(serverUrl, username, password),
    ping: () => ping(client),
    testUrl: (url) => testServerUrl(url),
    startScan: () => startScan(client),
    disconnect: () => {},
  };

  const albums: AlbumsApi = {
    list: async () => {
      const [baseAlbums, starred] = await Promise.all([
        getAlbumList(client),
        getStarredItems(client),
      ]);
      const baseIds = new Set(baseAlbums.map((a) => a.id));
      const albumIdsFromStarred = [
        ...new Set(
          (starred.songs ?? [])
            .map((s) => s.albumId)
            .filter((id): id is string => !!id)
        ),
      ].filter((id) => !baseIds.has(id));
      const extraAlbums = await Promise.all(
        albumIdsFromStarred.map((id) => getAlbum(client, id))
      );
      const added = extraAlbums.filter(
        (a): a is NonNullable<typeof a> => a !== null
      );
      return [...baseAlbums, ...added];
    },

    get: async (id: string) => {
      const full = await getAlbum(client, id);
      if (!full) throw new Error("Album not found");
      return full;
    },
  };

  const artists: ArtistsApi = {
    list: async () => getArtists(client),
    get: async (id: string) => {
      const artist = await getArtist(client, id);
      if (!artist) throw new Error("Artist not found");
      return artist;
    },
  };

  const genres: GenresApi = {
    list: async () => getGenres(client),
  };

  const playlists: PlaylistsApi = {
    list: async () => {
      const [playlists, starred] = await Promise.all([
        getPlaylists(client),
        getStarredItems(client),
      ]);
      const favorites = buildFavoritesPlaylist(starred.songs ?? []);
      return [favorites, ...playlists];
    },

    get: async (id: string) => {
      if (id === FAVORITES_ID) {
        const starred = await getStarredItems(client);
        return buildFavoritesPlaylist(starred.songs ?? []);
      }
      const playlist = await getPlaylist(client, id);
      if (!playlist) throw new Error("Playlist not found");
      return playlist;
    },

    create: async (name: string) => {
      const res = await createPlaylist(client, name);
      if (!res.id) throw new Error("Failed to create playlist");
      return res.id;
    },

    addSong: async (playlistId, songId) => {
      if (playlistId === FAVORITES_ID) {
        await star(client, songId);
        return { success: true };
      }
      return addSongToPlaylist(client, playlistId, songId);
    },

    removeSong: async (playlistId, songId) => {
      if (playlistId === FAVORITES_ID) {
        await unstar(client, songId);
        return { success: true };
      }
      const playlist = await getPlaylist(client, playlistId);
      if (!playlist) throw new Error("Playlist not found");
      const index = playlist.songs.findIndex((s: Song) => s.id === songId);
      if (index === -1) throw new Error("Song not found in playlist");
      return removeSongFromPlaylist(client, playlistId, index.toString());
    },

    delete: async (id: string) => {
      if (id === FAVORITES_ID) {
        throw new Error("Cannot delete Favorites playlist");
      }
      await deletePlaylist(client, id);
    },
  };

  const starred: StarredApi = {
    list: async () => getStarredItems(client),
    add: async (id) => { await star(client, id); },
    remove: async (id) => { await unstar(client, id); },
  };

  const songs: SongsApi = {
    get: async (id: string) => getSong(client, id),
  };

  const similar: SimilarApi = {
    getSimilarSongs: async (songId: string) => getSimilarSongs(client, songId),
  };

  const lyrics: LyricsApi = {
    getBySongId: async (songId) => getLyricsBySongId(client, songId),
  };

  const search = {
    search: async (query: string) => searchNavidrome(client, query),
  };

  return {
    auth,
    albums,
    artists,
    genres,
    playlists,
    starred,
    songs,
    similar,
    lyrics,
    search
  };
};