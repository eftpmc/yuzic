import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AlbumBase, Artist, PlaylistBase, SongBase, Song } from '@/types';

interface LibraryState {
  albums: AlbumBase[];
  artists: Artist[];
  playlists: PlaylistBase[];
  tracks: SongBase[];
  genres: Record<string, string[]>;
}

const initialState: LibraryState = {
  albums: [],
  artists: [],
  playlists: [],
  tracks: [],
  genres: {},
};

const librarySlice = createSlice({
  name: 'library',
  initialState,
  reducers: {
    setLibraryAlbums(state, action: PayloadAction<AlbumBase[]>) {
      state.albums = action.payload;
    },
    setLibraryArtists(state, action: PayloadAction<Artist[]>) {
      state.artists = action.payload;
    },
    setLibraryPlaylists(state, action: PayloadAction<PlaylistBase[]>) {
      state.playlists = action.payload;
    },
    setLibraryTracks(state, action: PayloadAction<SongBase[]>) {
      state.tracks = action.payload;
    },
    setLibraryGenres(state, action: PayloadAction<{ serverId: string; genres: string[] }>) {
      state.genres[action.payload.serverId] = action.payload.genres;
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
    clearLibrary(state) {
      state.albums = [];
      state.artists = [];
      state.playlists = [];
      state.tracks = [];
      // genres are keyed by serverId so no need to clear them
    },
  },
});

export const {
  setLibraryAlbums,
  setLibraryArtists,
  setLibraryPlaylists,
  setLibraryTracks,
  setLibraryGenres,
  addLibraryPlaylistSong,
  removeLibraryPlaylistSong,
  renameLibraryPlaylist,
  removeLibraryPlaylist,
  clearLibrary,
} = librarySlice.actions;

export default librarySlice.reducer;
