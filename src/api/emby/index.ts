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
  LyricsApi,
  SearchApi
} from "../types";

import { Playlist, Server } from "@/types";

import { EMBY_BRAND } from "../mediaBrowser/brand";
import { createEmbyClient } from "./client";
import { connect } from "../mediaBrowser/auth/connect";
import { ping } from "../mediaBrowser/auth/ping";
import { testServerUrl } from "../mediaBrowser/auth/testServerUrl";
import { startScan } from "../mediaBrowser/auth/startScan";
import { getAlbum } from "../mediaBrowser/albums/getAlbum";
import { getAlbums } from "../mediaBrowser/albums/getAlbums";
import { getAlbumsWithSongs } from "../mediaBrowser/albums/getAlbumsWithSongs";
import { getArtists } from "../mediaBrowser/artists/getArtists";
import { getPlaylists } from "../mediaBrowser/playlists/getPlaylists";
import { getPlaylistItems, getPlaylistEntryIdForSong } from "../mediaBrowser/playlists/getPlaylistItems";
import { createPlaylist } from "../mediaBrowser/playlists/createPlaylist";
import { deletePlaylist } from "../mediaBrowser/playlists/deletePlaylist";
import { updatePlaylistName } from "../mediaBrowser/playlists/updatePlaylistName";
import { addPlaylistItems } from "../mediaBrowser/playlists/addPlaylistItems";
import { removePlaylistItems } from "../mediaBrowser/playlists/removePlaylistItems";
import { getStarredItems } from "../mediaBrowser/starred/getStarredItems";
import { star } from "../mediaBrowser/starred/star";
import { unstar } from "../mediaBrowser/starred/unstar";
import { getArtist } from "../mediaBrowser/artists/getArtist";
import { getGenres } from "../mediaBrowser/genres/getGenres";
import { buildFavoritesPlaylist } from "@/utils/builders/buildFavoritesPlaylist";
import { FAVORITES_ID } from "@/constants/favorites";
import { getLyricsBySongId } from "../mediaBrowser/lyrics/getLyricsBySongId";
import { getSong } from "../mediaBrowser/songs/getSong";
import { markPlayed } from "../mediaBrowser/songs/markPlayed";
import { reportPlaybackStart, reportPlaybackProgress, reportPlaybackStop, clearPlaybackPosition } from "../mediaBrowser/playback/report";
import { getBookmarksFromUserData } from "../mediaBrowser/bookmarks/bookmarks";
import { getTracks } from "../mediaBrowser/tracks/getTracks";
import { getInstantMix } from "../mediaBrowser/instantMix/getInstantMix";
import { getSimilarAlbums, getSimilarArtists } from "../mediaBrowser/similar/getSimilarItems";
import { search as searchEmby } from "../mediaBrowser/search/search";

export const createEmbyAdapter = (server: Server): ApiAdapter => {
  const { id: serverId, serverUrl, fallbackUrls, auth: providerAuth, basicAuth } = server;
  const { token, userId } = providerAuth as { token: string; userId: string };

  // Support new array format (parentIds) and old single-value format (parentId)
  const parentIds: string[] =
    Array.isArray(providerAuth?.parentIds) ? (providerAuth.parentIds as string[]) :
    (providerAuth as any)?.parentId ? [String((providerAuth as any).parentId)] :
    [];

  const client = createEmbyClient({ serverUrl, serverId, fallbackUrls, token, userId, basicAuth });

  const clientFor = (pid: string) =>
    createEmbyClient({ serverUrl, serverId, fallbackUrls, token, userId, parentId: pid, basicAuth });

  async function fromParents<T extends { id: string }>(
    fn: (c: ReturnType<typeof createEmbyClient>) => Promise<T[]>
  ): Promise<T[]> {
    if (parentIds.length === 0) return fn(client);
    if (parentIds.length === 1) return fn(clientFor(parentIds[0]));
    const all = (await Promise.all(parentIds.map(id => fn(clientFor(id))))).flat();
    const seen = new Set<string>();
    return all.filter(item => !seen.has(item.id) && (seen.add(item.id), true));
  }

  const auth: AuthApi = {
    connect: async (serverUrl, username, password) => {
      return connect(EMBY_BRAND, serverUrl, username, password);
    },
    ping: async () => {
      if (!token) return false;
      return ping(client);
    },
    testUrl: async (url) => testServerUrl(EMBY_BRAND, url),
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

    rename: async (id: string, newName: string) => {
      if (id === FAVORITES_ID) {
        throw new Error("Cannot rename Favorites playlist");
      }
      await updatePlaylistName(client, id, newName);
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
    reportPlaybackStart: async (songId, positionMs) => reportPlaybackStart(client, songId, positionMs),
    reportPlaybackProgress: async (songId, positionMs, isPaused) =>
      reportPlaybackProgress(client, songId, positionMs, isPaused),
    reportPlaybackStop: async (songId, positionMs) => reportPlaybackStop(client, songId, positionMs),
  };

  const tracks: TracksApi = {
    list: async () => fromParents(c => getTracks(c)),
    get: async (id: string) => getSong(client, id),
  };

  const similar: SimilarApi = {
    getSimilarSongs: async (songId: string) => getInstantMix(client, songId),
    getSimilarArtists: async (artistId, limit) => getSimilarArtists(client, artistId, limit),
    getSimilarAlbums: async (albumId, limit) => getSimilarAlbums(client, albumId, limit),
  };

  const lyrics: LyricsApi = {
    getBySongId: async (songId) => getLyricsBySongId(client, songId),
  };

  const search: SearchApi = {
    search: async (query: string) => searchEmby(client, query),
  };

  // Same shape as Jellyfin — see the note in api/jellyfin/index.ts.
  const bookmarks = {
    list: async () => getBookmarksFromUserData(client),
    create: async (input: { songId: string; positionMs: number }) =>
      reportPlaybackStop(client, input.songId, input.positionMs),
    remove: async (songId: string) => clearPlaybackPosition(client, songId),
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
    search,
    bookmarks,
  };
};
