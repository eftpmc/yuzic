import React, { createContext, useContext, ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { Album, Artist, Playlist } from '@/types';
import { SongBase, Song } from '@/types';
import {
  selectLibraryAlbums,
  selectLibraryArtists,
  selectLibraryPlaylists,
  selectLibraryTracks,
  selectLibraryGenres,
  selectLibraryStarred,
} from '@/utils/redux/selectors/librarySelectors';

interface LibraryContextType {
  albums: Album[];
  artists: Artist[];
  playlists: Playlist[];
  tracks: SongBase[];
  genres: string[];
  starred: Song[];
}

const LibraryContext = createContext<LibraryContextType>({
  albums: [],
  artists: [],
  playlists: [],
  tracks: [],
  genres: [],
  starred: [],
});

export const useLibrary = () => useContext(LibraryContext);

export const LibraryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const albums = useSelector(selectLibraryAlbums);
  const artists = useSelector(selectLibraryArtists);
  const playlists = useSelector(selectLibraryPlaylists);
  const tracks = useSelector(selectLibraryTracks);
  const genres = useSelector(selectLibraryGenres);
  const starred = useSelector(selectLibraryStarred);

  return (
    <LibraryContext.Provider value={{ albums, artists, playlists, tracks, genres, starred }}>
      {children}
    </LibraryContext.Provider>
  );
};
