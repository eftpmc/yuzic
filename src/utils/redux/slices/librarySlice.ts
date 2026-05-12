import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AlbumBase, Artist, PlaylistBase, SongBase, Song } from '@/types';

interface LibraryState {
  albums: AlbumBase[];
  artists: Artist[];
  playlists: PlaylistBase[];
  tracks: SongBase[];
  genres: string[];
  starred: Song[];
}

const initialState: LibraryState = {
  albums: [],
  artists: [],
  playlists: [],
  tracks: [],
  genres: [],
  starred: [],
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
    setLibraryGenres(state, action: PayloadAction<string[]>) {
      state.genres = action.payload;
    },
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
    removeLibraryPlaylist(state, action: PayloadAction<string>) {
      state.playlists = state.playlists.filter(p => p.id !== action.payload);
    },
  },
});

export const {
  setLibraryAlbums,
  setLibraryArtists,
  setLibraryPlaylists,
  setLibraryTracks,
  setLibraryGenres,
  setLibraryStarred,
  addLibraryStarredSong,
  removeLibraryStarredSong,
  addLibraryPlaylistSong,
  removeLibraryPlaylistSong,
  removeLibraryPlaylist,
} = librarySlice.actions;

export default librarySlice.reducer;
