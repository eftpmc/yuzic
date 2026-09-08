import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AlbumBase } from '@/types';

/**
 * Separated from the shared `library` slice so its persisted JSON blob
 * doesn't compete with tracks / artists / playlists during cold-boot
 * rehydrate. Each collection now stringifies and MMKV-writes independently.
 */
interface LibraryAlbumsState {
  albums: AlbumBase[];
}

const initialState: LibraryAlbumsState = { albums: [] };

const slice = createSlice({
  name: 'libraryAlbums',
  initialState,
  reducers: {
    setLibraryAlbums(state, action: PayloadAction<AlbumBase[]>) {
      state.albums = action.payload;
    },
    clearLibraryAlbums(state) {
      state.albums = [];
    },
  },
});

export const { setLibraryAlbums, clearLibraryAlbums } = slice.actions;
export default slice.reducer;
