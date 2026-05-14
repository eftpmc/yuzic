import { createSelector } from '@reduxjs/toolkit';
import { AlbumBase, Artist, SongBase } from '@/types';
import { RootState } from '../store';

export const selectLibraryAlbums = (state: RootState) => state.library.albums;
export const selectLibraryArtists = (state: RootState) => state.library.artists;
export const selectLibraryPlaylists = (state: RootState) => state.library.playlists;
export const selectLibraryTracks = (state: RootState) => state.library.tracks;
export const selectLibraryGenres = createSelector(
  [(state: RootState) => state.library.genres, (state: RootState) => state.servers.activeServerId],
  (genresByServer, activeServerId): string[] => {
    if (!activeServerId) return []
    return genresByServer[activeServerId] ?? []
  }
);
export const selectLibraryStarred = (state: RootState) => state.library.starred;

// Memoized O(1) lookup maps — rebuilt only when the underlying array changes
export const selectAlbumsById = createSelector(
  selectLibraryAlbums,
  (albums): Map<string, AlbumBase> => new Map(albums.map(a => [a.id, a]))
);

export const selectArtistsById = createSelector(
  selectLibraryArtists,
  (artists): Map<string, Artist> => new Map(artists.map(a => [a.id, a]))
);

export const selectSongsById = createSelector(
  selectLibraryTracks,
  (tracks): Map<string, SongBase> => new Map(tracks.map(song => [song.id, song]))
);
