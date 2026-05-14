import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type PlayMap = Record<string, number>;
type LastPlayedMap = Record<string, number>; // "serverId:entityId" -> timestamp (ms)

const key = (serverId: string, id: string) => `${serverId}:${id}`;

export type ServerAlbumStat = {
  id: string;
  playCount: number;
  lastPlayedAt: number; // unix ms, 0 if never played
};

export type ServerSongStat = {
  id: string;
  playCount: number;
};

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
      for (const { id, playCount, lastPlayedAt } of stats) {
        const k = key(serverId, id);
        state.serverAlbumPlays[k] = playCount;
        if (lastPlayedAt > 0) state.serverAlbumLastPlayedAt[k] = lastPlayedAt;
      }
    },

    setServerSongStats(
      state,
      action: PayloadAction<{ serverId: string; stats: ServerSongStat[] }>
    ) {
      const { serverId, stats } = action.payload;
      for (const { id, playCount } of stats) {
        state.serverSongPlays[key(serverId, id)] = playCount;
      }
    },

    clearOfflinePlays(
      state,
      action: PayloadAction<{ serverId: string }>
    ) {
      const prefix = `${action.payload.serverId}:`;
      for (const k of Object.keys(state.albumPlays)) {
        if (k.startsWith(prefix)) delete state.albumPlays[k];
      }
      for (const k of Object.keys(state.songPlays)) {
        if (k.startsWith(prefix)) delete state.songPlays[k];
      }
    },
  },
});

export const { incrementPlay, setServerAlbumStats, setServerSongStats, clearOfflinePlays } = statsSlice.actions;
export default statsSlice.reducer;