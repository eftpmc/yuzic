import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type PlayMap = Record<string, number>;

interface StatsState {
  songPlays: PlayMap;
  albumPlays: PlayMap;
  artistPlays: PlayMap;
}

const initialState: StatsState = {
  songPlays: {},
  albumPlays: {},
  artistPlays: {},
};

const increment = (map: PlayMap, id?: string) => {
  if (!id) return;
  map[id] = (map[id] ?? 0) + 1;
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

      increment(state.songPlays, songId);
      increment(state.albumPlays, albumId);
      increment(state.artistPlays, artistId);
    },
  },
});

export const { incrementPlay } = statsSlice.actions;
export default statsSlice.reducer;