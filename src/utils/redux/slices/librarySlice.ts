import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  AlbumBase,
  ArtistBase,
  GenreListing,
  PlaylistBase,
  Song,
} from "@/types";

interface StarredState {
  songs: Song[];
}

interface LibraryState {
  albumList: AlbumBase[];
  artistList: ArtistBase[];
  playlistList: PlaylistBase[];

  genres: GenreListing[];
  starred: StarredState;
}

const initialState: LibraryState = {
  albumList: [],
  artistList: [],
  playlistList: [],

  genres: [],
  starred: {
    songs: [],
  },
};

const librarySlice = createSlice({
  name: "library",
  initialState,
  reducers: {
    setAlbumList(state, action: PayloadAction<AlbumBase[]>) {
      state.albumList = action.payload;
    },

    setArtistList(state, action: PayloadAction<ArtistBase[]>) {
      state.artistList = action.payload;
    },

    setPlaylistList(state, action: PayloadAction<PlaylistBase[]>) {
      state.playlistList = action.payload;
    },

    setGenres(state, action: PayloadAction<GenreListing[]>) {
      state.genres = action.payload;
    },

    setStarred(state, action: PayloadAction<StarredState>) {
      state.starred = action.payload;
    },

    resetLibraryState() {
      return initialState;
    },
  },
});

export const {
  setAlbumList,
  setArtistList,
  setPlaylistList,
  setGenres,
  setStarred,
  resetLibraryState,
} = librarySlice.actions;

export default librarySlice.reducer;