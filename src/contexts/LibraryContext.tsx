import React, { createContext, useContext, useMemo, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { AlbumBase, Artist, PlaylistBase, SongBase, Song } from '@/types';
import {
  selectLibraryAlbums,
  selectLibraryArtists,
  selectLibraryPlaylists,
  selectLibraryTracks,
  selectLibraryGenres,
  selectLibraryStarred,
  selectLibraryStarredAlbums,
} from '@/utils/redux/selectors/librarySelectors';

interface LibraryContextType {
  albums: AlbumBase[];
  artists: Artist[];
  playlists: PlaylistBase[];
  tracks: SongBase[];
  genres: string[];
  starred: Song[];
  starredAlbums: AlbumBase[];
}

const LibraryContext = createContext<LibraryContextType>({
  albums: [],
  artists: [],
  playlists: [],
  tracks: [],
  genres: [],
  starred: [],
  starredAlbums: [],
});

export const useLibrary = () => useContext(LibraryContext);

export const LibraryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const albums = useSelector(selectLibraryAlbums);
  const artists = useSelector(selectLibraryArtists);
  const playlists = useSelector(selectLibraryPlaylists);
  const tracks = useSelector(selectLibraryTracks);
  const genres = useSelector(selectLibraryGenres);
  const starred = useSelector(selectLibraryStarred);
  const starredAlbums = useSelector(selectLibraryStarredAlbums);

  const value = useMemo(
    () => ({ albums, artists, playlists, tracks, genres, starred, starredAlbums }),
    [albums, artists, playlists, tracks, genres, starred, starredAlbums],
  );
  return (
    <LibraryContext.Provider value={value}>
      {children}
    </LibraryContext.Provider>
  );
};
