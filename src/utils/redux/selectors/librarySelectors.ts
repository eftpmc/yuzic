import { createSelector } from '@reduxjs/toolkit';
import { Album, Artist, Song } from '@/types';
import { RootState } from '../store';

export const selectLibraryAlbums = (state: RootState) => state.library.albums;
export const selectLibraryArtists = (state: RootState) => state.library.artists;
export const selectLibraryPlaylists = (state: RootState) => state.library.playlists;
export const selectLibraryTracks = (state: RootState) => state.library.tracks;
export const selectLibraryGenres = (state: RootState) => state.library.genres;
export const selectLibraryStarred = (state: RootState) => state.library.starred;

// Memoized O(1) lookup maps — rebuilt only when the underlying array changes
export const selectAlbumsById = createSelector(
  selectLibraryAlbums,
  (albums): Map<string, Album> => new Map(albums.map(a => [a.id, a]))
);

export const selectArtistsById = createSelector(
  selectLibraryArtists,
  (artists): Map<string, Artist> => new Map(artists.map(a => [a.id, a]))
);

export const selectSongsById = createSelector(
  selectLibraryAlbums,
  (albums): Map<string, Song> => {
    const map = new Map<string, Song>();
    for (const album of albums) {
      for (const song of album.songs ?? []) {
        map.set(song.id, song);
      }
    }
    return map;
  }
);
