import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Album, Artist, Playlist } from '@/types';
import { SongBase, Song } from '@/types';

interface LibraryState {
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
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
    setLibraryAlbums(state, action: PayloadAction<Album[]>) {
      state.albums = action.payload;
    },
    setLibraryArtists(state, action: PayloadAction<Artist[]>) {
      state.artists = action.payload;
    },
    setLibraryPlaylists(state, action: PayloadAction<Playlist[]>) {
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
  },
});

export const {
  setLibraryAlbums,
  setLibraryArtists,
  setLibraryPlaylists,
  setLibraryTracks,
  setLibraryGenres,
  setLibraryStarred,
} = librarySlice.actions;

export default librarySlice.reducer;
