import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AlbumBase, Song } from '@/types';

interface LibraryStarredState {
  starred: Song[];
  starredAlbums: AlbumBase[];
}

const initialState: LibraryStarredState = {
  starred: [],
  starredAlbums: [],
};

const libraryStarredSlice = createSlice({
  name: 'libraryStarred',
  initialState,
  reducers: {
    setLibraryStarred(state, action: PayloadAction<Song[]>) {
      state.starred = action.payload;
    },
    addLibraryStarredSong(state, action: PayloadAction<Song>) {
      if (!state.starred.some(song => song.id === action.payload.id)) {
        state.starred.push(action.payload);
      }
    },
    removeLibraryStarredSong(state, action: PayloadAction<string>) {
      state.starred = state.starred.filter(song => song.id !== action.payload);
    },
    setLibraryStarredAlbums(state, action: PayloadAction<AlbumBase[]>) {
      state.starredAlbums = action.payload;
    },
    clearLibraryStarred(state) {
      state.starred = [];
      state.starredAlbums = [];
    },
  },
});

export const {
  setLibraryStarred,
  addLibraryStarredSong,
  removeLibraryStarredSong,
  setLibraryStarredAlbums,
  clearLibraryStarred,
} = libraryStarredSlice.actions;

export default libraryStarredSlice.reducer;
