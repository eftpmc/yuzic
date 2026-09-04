import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { SongBase } from '@/types';

/**
 * Historically the biggest persisted blob. Split off so its
 * JSON.parse on cold-boot doesn't block the album/artist rehydrate.
 */
interface LibraryTracksState {
  tracks: SongBase[];
}

const initialState: LibraryTracksState = { tracks: [] };

const slice = createSlice({
  name: 'libraryTracks',
  initialState,
  reducers: {
    setLibraryTracks(state, action: PayloadAction<SongBase[]>) {
      state.tracks = action.payload;
    },
    clearLibraryTracks(state) {
      state.tracks = [];
    },
  },
});

export const { setLibraryTracks, clearLibraryTracks } = slice.actions;
export default slice.reducer;
