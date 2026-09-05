import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type PlayMap = Record<string, number>;
type LastPlayedMap = Record<string, number>; // "serverId:entityId" -> timestamp (ms)

const key = (serverId: string, id: string) => `${serverId}:${id}`;

/**
 * Drops one server's entries from a map, in place, so the caller can write the
 * set the server just reported.
 *
 * Server stat maps used to only ever be merged into, so an album whose count
 * went back to zero — or that left the library entirely — kept its old number
 * for good, and the map grew without bound across library churn.
 */
function replaceNamespace(map: Record<string, number>, serverId: string): void {
  const prefix = `${serverId}:`;
  for (const k of Object.keys(map)) {
    if (k.startsWith(prefix)) delete map[k];
  }
}

export type ServerAlbumStat = {
  id: string;
  playCount: number;
  lastPlayedAt: number; // unix ms, 0 if never played
};

export type ServerSongStat = {
  id: string;
  playCount: number;
  lastPlayedAt?: number;
};

/**
 * Play statistics, in two halves that are reconciled differently.
 *
 * Songs and albums have a server number, so the local tally is optimistic:
 * counted here the moment a listen passes the scrobble threshold, then dropped
 * per entity as the server's own count arrives for it during sync (see
 * `setServerSongStats`). What the server doesn't report on keeps its local
 * tally, which is what makes a listen recorded while the server was offline —
 * or while server scrobbling is switched off — survive.
 *
 * Artists and playlists have no server number at all: neither Subsonic nor
 * Jellyfin exposes one, and nothing else fills these in. They are therefore
 * the whole truth rather than an optimistic overlay, and nothing may clear
 * them. A blanket "clear local counts after sync" used to, which quietly reset
 * every artist and playlist count to zero on every sync — so the artist
 * ordering behind Home's seeds, the count on an artist's options sheet, and
 * the frequency half of quick-access scoring were all reading zeros forever.
 */
interface StatsState {
  songPlays: PlayMap;
  albumPlays: PlayMap;
  artistPlays: PlayMap;
  playlistPlays: PlayMap;
  songLastPlayedAt: LastPlayedMap;
  albumLastPlayedAt: LastPlayedMap;
  artistLastPlayedAt: LastPlayedMap;
  playlistLastPlayedAt: LastPlayedMap;
  /** Play counts sourced from the server during sync. Key: "serverId:albumId" */
  serverAlbumPlays: PlayMap;
  /** Last played timestamps sourced from the server during sync. Key: "serverId:albumId" */
  serverAlbumLastPlayedAt: LastPlayedMap;
  /** Play counts sourced from the server during sync. Key: "serverId:songId" */
  serverSongPlays: PlayMap;
  /** Last played timestamps sourced from the server during sync. Key: "serverId:songId" */
  serverSongLastPlayedAt: LastPlayedMap;
}

const initialState: StatsState = {
  songPlays: {},
  albumPlays: {},
  artistPlays: {},
  playlistPlays: {},
  songLastPlayedAt: {},
  albumLastPlayedAt: {},
  artistLastPlayedAt: {},
  playlistLastPlayedAt: {},
  serverAlbumPlays: {},
  serverAlbumLastPlayedAt: {},
  serverSongPlays: {},
  serverSongLastPlayedAt: {},
};

const statsSlice = createSlice({
  name: "stats",
  initialState,
  reducers: {
    incrementPlay(
      state,
      action: PayloadAction<{
        serverId: string;
        songId: string;
        albumId?: string;
        artistId?: string;
        playlistId?: string;
      }>
    ) {
      const { serverId, songId, albumId, artistId, playlistId } = action.payload;
      const now = Date.now();

      if (songId) {
        const k = key(serverId, songId);
        state.songPlays[k] = (state.songPlays[k] ?? 0) + 1;
        state.songLastPlayedAt[k] = now;
      }
      if (albumId) {
        const k = key(serverId, albumId);
        state.albumPlays[k] = (state.albumPlays[k] ?? 0) + 1;
        state.albumLastPlayedAt[k] = now;
      }
      if (artistId) {
        const k = key(serverId, artistId);
        state.artistPlays[k] = (state.artistPlays[k] ?? 0) + 1;
        state.artistLastPlayedAt[k] = now;
      }
      if (playlistId) {
        const k = key(serverId, playlistId);
        state.playlistPlays[k] = (state.playlistPlays[k] ?? 0) + 1;
        state.playlistLastPlayedAt[k] = now;
      }
    },

    setServerAlbumStats(
      state,
      action: PayloadAction<{ serverId: string; stats: ServerAlbumStat[] }>
    ) {
      const { serverId, stats } = action.payload;
      replaceNamespace(state.serverAlbumPlays, serverId);
      replaceNamespace(state.serverAlbumLastPlayedAt, serverId);
      for (const { id, playCount, lastPlayedAt } of stats) {
        const k = key(serverId, id);
        state.serverAlbumPlays[k] = playCount;
        if (lastPlayedAt > 0) state.serverAlbumLastPlayedAt[k] = lastPlayedAt;
        // This album's server number now includes the plays we counted
        // ourselves, so the local tally has been reconciled and must go —
        // keeping it would add the same listen twice.
        delete state.albumPlays[k];
      }
    },

    setServerSongStats(
      state,
      action: PayloadAction<{ serverId: string; stats: ServerSongStat[] }>
    ) {
      const { serverId, stats } = action.payload;
      replaceNamespace(state.serverSongPlays, serverId);
      replaceNamespace(state.serverSongLastPlayedAt, serverId);
      for (const { id, playCount, lastPlayedAt } of stats) {
        const k = key(serverId, id);
        state.serverSongPlays[k] = playCount;
        if (lastPlayedAt && lastPlayedAt > 0) {
          state.serverSongLastPlayedAt[k] = lastPlayedAt;
        }
        delete state.songPlays[k];
      }
    },
  },
});

export const { incrementPlay, setServerAlbumStats, setServerSongStats } = statsSlice.actions;
export default statsSlice.reducer;
