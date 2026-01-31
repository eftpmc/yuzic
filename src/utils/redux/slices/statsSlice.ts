import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type PlayMap = Record<string, number>;
type LastPlayedMap = Record<string, number>; // "serverId:entityId" -> timestamp (ms)

const key = (serverId: string, id: string) => `${serverId}:${id}`;

interface StatsState {
  songPlays: PlayMap;
  albumPlays: PlayMap;
  artistPlays: PlayMap;
  songLastPlayedAt: LastPlayedMap;
  albumLastPlayedAt: LastPlayedMap;
  artistLastPlayedAt: LastPlayedMap;
}

const initialState: StatsState = {
  songPlays: {},
  albumPlays: {},
  artistPlays: {},
  songLastPlayedAt: {},
  albumLastPlayedAt: {},
  artistLastPlayedAt: {},
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
      }>
    ) {
      const { serverId, songId, albumId, artistId } = action.payload;
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
    },
  },
});

export const { incrementPlay } = statsSlice.actions;
export default statsSlice.reducer;