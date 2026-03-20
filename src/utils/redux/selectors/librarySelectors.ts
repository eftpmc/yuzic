import { RootState } from '../store';

export const selectLibraryAlbums = (state: RootState) => state.library.albums;
export const selectLibraryArtists = (state: RootState) => state.library.artists;
export const selectLibraryPlaylists = (state: RootState) => state.library.playlists;
export const selectLibraryTracks = (state: RootState) => state.library.tracks;
export const selectLibraryGenres = (state: RootState) => state.library.genres;
export const selectLibraryStarred = (state: RootState) => state.library.starred;
