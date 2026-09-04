import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Artist } from '@/types';

interface LibraryArtistsState {
  artists: Artist[];
}

const initialState: LibraryArtistsState = { artists: [] };

const slice = createSlice({
  name: 'libraryArtists',
  initialState,
  reducers: {
    setLibraryArtists(state, action: PayloadAction<Artist[]>) {
      state.artists = action.payload;
    },
    clearLibraryArtists(state) {
      state.artists = [];
    },
  },
});

export const { setLibraryArtists, clearLibraryArtists } = slice.actions;
export default slice.reducer;
