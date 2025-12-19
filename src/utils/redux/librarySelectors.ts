import { RootState } from "@/utils/redux/store";

export const selectAlbumList = (state: RootState) =>
  state.library.albumList;

export const selectArtistList = (state: RootState) =>
  state.library.artistList;

export const selectPlaylistList = (state: RootState) =>
  state.library.playlistList;

export const selectAlbumById =
  (id: string) =>
    (state: RootState) =>
      state.library.albumsById[id] ?? null;

export const selectArtistById =
  (id: string) =>
    (state: RootState) =>
      state.library.artistsById[id] ?? null;

export const selectPlaylistById =
  (id: string) =>
    (state: RootState) =>
      state.library.playlistsById[id] ?? null;

export const selectGenres = (state: RootState) =>
  state.library.genres;

export const selectGenreByName =
  (name: string) =>
    (state: RootState) =>
      state.library.genres.find(g => g.name === name) ?? null;

export const selectStarred = (state: RootState) =>
  state.library.starred;