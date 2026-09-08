import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PlaylistBase, Song } from '@/types';

interface LibraryPlaylistsState {
  playlists: PlaylistBase[];
}

const initialState: LibraryPlaylistsState = { playlists: [] };

const slice = createSlice({
  name: 'libraryPlaylists',
  initialState,
  reducers: {
    setLibraryPlaylists(state, action: PayloadAction<PlaylistBase[]>) {
      state.playlists = action.payload;
    },
    addLibraryPlaylistSong(
      state,
      action: PayloadAction<{ playlistId: string; song: Song }>
    ) {
      const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
      if (!playlist) return;
      playlist.changed = new Date();
    },
    removeLibraryPlaylistSong(
      state,
      action: PayloadAction<{ playlistId: string; songId: string }>
    ) {
      const playlist = state.playlists.find(p => p.id === action.payload.playlistId);
      if (!playlist) return;
      playlist.changed = new Date();
    },
    renameLibraryPlaylist(state, action: PayloadAction<{ id: string; newName: string }>) {
      const playlist = state.playlists.find(p => p.id === action.payload.id);
      if (!playlist) return;
      playlist.title = action.payload.newName;
      playlist.changed = new Date();
    },
    removeLibraryPlaylist(state, action: PayloadAction<string>) {
      state.playlists = state.playlists.filter(p => p.id !== action.payload);
    },
    clearLibraryPlaylists(state) {
      state.playlists = [];
    },
  },
});

export const {
  setLibraryPlaylists,
  addLibraryPlaylistSong,
  removeLibraryPlaylistSong,
  renameLibraryPlaylist,
  removeLibraryPlaylist,
  clearLibraryPlaylists,
} = slice.actions;
export default slice.reducer;
