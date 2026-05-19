import {
  ApiAdapter,
  AlbumsApi,
  ArtistsApi,
  GenresApi,
  PlaylistsApi,
  StarredApi,
  SimilarApi,
  SongsApi,
  TracksApi,
  AuthApi,
  LyricsApi
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
import { getAlbumsWithSongs } from "./albums/getAlbumsWithSongs";

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
import { scrobble } from "./songs/scrobble";
import { getTracks } from "./tracks/getTracks";
import { getSimilarSongs } from "./similar/getSimilarSongs";

import { search as searchNavidrome } from "./search/search";

export const createNavidromeAdapter = (server: Server): ApiAdapter => {
  const { serverUrl, username, auth: providerAuth, basicAuth } = server;
  const password = providerAuth?.password as string;

  // Support new array format (musicFolderIds) and old single-value format (musicFolderId)
  const musicFolderIds: string[] =
    Array.isArray(providerAuth?.musicFolderIds) ? (providerAuth.musicFolderIds as string[]) :
    providerAuth?.musicFolderId ? [String(providerAuth.musicFolderId)] :
    [];

  const client = createNavidromeClient({ serverUrl, username, password, basicAuth });

  const clientFor = (folderId: string) =>
    createNavidromeClient({ serverUrl, username, password, defaultParams: { musicFolderId: folderId }, basicAuth });

  async function fromFolders<T extends { id: string }>(
    fn: (c: ReturnType<typeof createNavidromeClient>) => Promise<T[]>
  ): Promise<T[]> {
    if (musicFolderIds.length === 0) return fn(client);
    if (musicFolderIds.length === 1) return fn(clientFor(musicFolderIds[0]));
    const all = (await Promise.all(musicFolderIds.map(id => fn(clientFor(id))))).flat();
    const seen = new Set<string>();
    return all.filter(item => !seen.has(item.id) && (seen.add(item.id), true));
  }

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
        fromFolders(c => getAlbumList(c)),
        getStarredItems(client),
      ]);
      const baseIds = new Set(baseAlbums.map((a) => a.id));
      const seenStarredIds = new Set<string>();
      const albumIdsFromStarred: string[] = [];
      for (const s of starred.songs ?? []) {
        if (s.albumId && !seenStarredIds.has(s.albumId)) {
          seenStarredIds.add(s.albumId);
          if (!baseIds.has(s.albumId)) albumIdsFromStarred.push(s.albumId);
        }
      }
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

    listWithSongs: async () => fromFolders(c => getAlbumsWithSongs(c)),
  };

  const artists: ArtistsApi = {
    list: async () => fromFolders(c => getArtists(c)),
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
    scrobble: async (songId, timestamp) => scrobble(client, songId, timestamp),
    buildStreamUrl: (songId, quality) => client.buildStreamUrl(songId, quality),
  };

  const tracks: TracksApi = {
    list: async () => fromFolders(c => getTracks(c)),
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
    tracks,
    similar,
    lyrics,
    search
  };
};
