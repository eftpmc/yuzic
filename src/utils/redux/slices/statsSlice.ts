import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type PlayMap = Record<string, number>;
type LastPlayedMap = Record<string, number>; // id -> timestamp (ms)

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

const increment = (map: PlayMap, id?: string) => {
  if (!id) return;
  map[id] = (map[id] ?? 0) + 1;
};

const setLastPlayed = (map: LastPlayedMap, id: string | undefined, now: number) => {
  if (!id) return;
  map[id] = now;
};

const statsSlice = createSlice({
  name: "stats",
  initialState,
  reducers: {
    incrementPlay(
      state,
      action: PayloadAction<{
        songId: string;
        albumId?: string;
        artistId?: string;
      }>
    ) {
      const { songId, albumId, artistId } = action.payload;
      const now = Date.now();

      increment(state.songPlays, songId);
      increment(state.albumPlays, albumId);
      increment(state.artistPlays, artistId);

      setLastPlayed(state.songLastPlayedAt, songId, now);
      setLastPlayed(state.albumLastPlayedAt, albumId, now);
      setLastPlayed(state.artistLastPlayedAt, artistId, now);
    },
  },
});

export const { incrementPlay } = statsSlice.actions;
export default statsSlice.reducer;