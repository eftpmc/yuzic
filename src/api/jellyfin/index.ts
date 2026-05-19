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

import { Playlist, Server } from "@/types";

import { createJellyfinClient } from "./client";
import { connect } from "./auth/connect";
import { ping } from "./auth/ping";
import { testServerUrl } from "./auth/testServerUrl";
import { startScan } from "./auth/startScan";
import { getAlbum } from "./albums/getAlbum";
import { getAlbums } from "./albums/getAlbums";
import { getAlbumsWithSongs } from "./albums/getAlbumsWithSongs";
import { getArtists } from "./artists/getArtists";
import { getPlaylists } from "./playlists/getPlaylists";
import { getPlaylistItems, getPlaylistEntryIdForSong } from "./playlists/getPlaylistItems";
import { createPlaylist } from "./playlists/createPlaylist";
import { deletePlaylist } from "./playlists/deletePlaylist";
import { addPlaylistItems } from "./playlists/addPlaylistItems";
import { removePlaylistItems } from "./playlists/removePlaylistItems";
import { getStarredItems } from "./starred/getStarredItems";
import { star } from "./starred/star";
import { unstar } from "./starred/unstar";
import { getArtist } from "./artists/getArtist";
import { getGenres } from "./genres/getGenres";
import { buildFavoritesPlaylist } from "@/utils/builders/buildFavoritesPlaylist";
import { FAVORITES_ID } from "@/constants/favorites";
import { getLyricsBySongId } from "./lyrics/getLyricsBySongId";
import { getSong } from "./songs/getSong";
import { markPlayed } from "./songs/markPlayed";
import { getTracks } from "./tracks/getTracks";
import { getInstantMix } from "./instantMix/getInstantMix";
import { search as searchJellyfin } from "./search/search";

export const createJellyfinAdapter = (server: Server): ApiAdapter => {
  const { serverUrl, auth: providerAuth, basicAuth } = server;
  const { token, userId } = providerAuth as { token: string; userId: string };

  // Support new array format (parentIds) and old single-value format (parentId)
  const parentIds: string[] =
    Array.isArray(providerAuth?.parentIds) ? (providerAuth.parentIds as string[]) :
    (providerAuth as any)?.parentId ? [String((providerAuth as any).parentId)] :
    [];

  const client = createJellyfinClient({ serverUrl, token, userId, basicAuth });

  const clientFor = (pid: string) =>
    createJellyfinClient({ serverUrl, token, userId, parentId: pid, basicAuth });

  async function fromParents<T extends { id: string }>(
    fn: (c: ReturnType<typeof createJellyfinClient>) => Promise<T[]>
  ): Promise<T[]> {
    if (parentIds.length === 0) return fn(client);
    if (parentIds.length === 1) return fn(clientFor(parentIds[0]));
    const all = (await Promise.all(parentIds.map(id => fn(clientFor(id))))).flat();
    const seen = new Set<string>();
    return all.filter(item => !seen.has(item.id) && (seen.add(item.id), true));
  }

  const auth: AuthApi = {
    connect: async (serverUrl, username, password) => {
      return connect(serverUrl, username, password);
    },
    ping: async () => {
      if (!token) return false;
      return ping(client);
    },
    testUrl: async (url) => testServerUrl(url),
    startScan: async () => startScan(client),
    disconnect: () => {},
  };

  const albums: AlbumsApi = {
    list: async () => fromParents(c => getAlbums(c)),
    get: async (id: string) => {
      const album = await getAlbum(client, id);
      if (!album) throw new Error("Album not found");
      return album;
    },
    listWithSongs: async () => fromParents(c => getAlbumsWithSongs(c)),
  };

  const artists: ArtistsApi = {
    list: async () => fromParents(c => getArtists(c)),
    get: async (id: string) => {
      const artist = await getArtist(client, id);
      if (!artist) throw new Error("Artist not found");
      return artist;
    },
  };

  const genres: GenresApi = {
    list: async () => {
      if (parentIds.length === 0) return getGenres(client);
      if (parentIds.length === 1) return getGenres(clientFor(parentIds[0]));
      const all = (await Promise.all(parentIds.map(id => getGenres(clientFor(id))))).flat();
      return [...new Set(all)];
    },
  };

  const playlists: PlaylistsApi = {
    list: async () => {
      const [base, starred] = await Promise.all([
        getPlaylists(client),
        getStarredItems(client),
      ]);
      const favorites = buildFavoritesPlaylist(starred.songs ?? []);
      return [favorites, ...base];
    },

    get: async (id: string) => {
      if (id === FAVORITES_ID) {
        const starred = await getStarredItems(client);
        return buildFavoritesPlaylist(starred.songs ?? []);
      }
      const basePlaylists = await getPlaylists(client);
      const base = basePlaylists.find((p) => p.id === id);
      if (!base) throw new Error("Playlist not found");
      const songs = await getPlaylistItems(client, id);
      return { ...base, subtext: `Playlist • ${songs.length} songs`, songs } as Playlist;
    },

    create: async (name: string) => {
      const id = await createPlaylist(client, name);
      if (!id) throw new Error("Failed to create playlist");
      return id;
    },

    addSong: async (playlistId: string, songId: string) => {
      if (playlistId === FAVORITES_ID) {
        await star(client, songId);
        return { success: true };
      }
      await addPlaylistItems(client, playlistId, [songId]);
      return { success: true };
    },

    removeSong: async (playlistId: string, songId: string) => {
      if (playlistId === FAVORITES_ID) {
        await unstar(client, songId);
        return { success: true };
      }
      const entryId = await getPlaylistEntryIdForSong(client, playlistId, songId);
      if (!entryId) throw new Error("Song not found in playlist");
      await removePlaylistItems(client, playlistId, [entryId]);
      return { success: true };
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
    add: async (id: string) => { await star(client, id); },
    remove: async (id: string) => { await unstar(client, id); },
  };

  const songs: SongsApi = {
    get: async (id: string) => getSong(client, id),
    scrobble: async (songId) => markPlayed(client, songId),
    buildStreamUrl: (songId, quality, codec) => client.buildStreamUrl(songId, quality, codec),
  };

  const tracks: TracksApi = {
    list: async () => fromParents(c => getTracks(c)),
    get: async (id: string) => getSong(client, id),
  };

  const similar: SimilarApi = {
    getSimilarSongs: async (songId: string) => getInstantMix(client, songId),
  };

  const lyrics: LyricsApi = {
    getBySongId: async (songId) => getLyricsBySongId(client, songId),
  };

  const search = {
    search: async (query: string) => searchJellyfin(client, query),
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
