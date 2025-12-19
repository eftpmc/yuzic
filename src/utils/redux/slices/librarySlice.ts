import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Album,
  AlbumBase,
  Artist,
  ArtistBase,
  GenreListing,
  Playlist,
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

  albumsById: Record<string, Album>;
  artistsById: Record<string, Artist>;
  playlistsById: Record<string, Playlist>;

  genres: GenreListing[];
  starred: StarredState;
}

const initialState: LibraryState = {
  albumList: [],
  artistList: [],
  playlistList: [],

  albumsById: {},
  artistsById: {},
  playlistsById: {},

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

    upsertAlbum(state, action: PayloadAction<Album>) {
      state.albumsById[action.payload.id] = action.payload;
    },

    upsertArtist(state, action: PayloadAction<Artist>) {
      state.artistsById[action.payload.id] = action.payload;
    },

    upsertPlaylist(state, action: PayloadAction<Playlist>) {
      state.playlistsById[action.payload.id] = action.payload;
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
  upsertAlbum,
  upsertArtist,
  upsertPlaylist,
  setGenres,
  setStarred,
  resetLibraryState,
} = librarySlice.actions;

export default librarySlice.reducer;