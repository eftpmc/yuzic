import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
} from 'react';
import {
  AlbumBase,
  ArtistBase,
  PlaylistBase,
  CoverSource,
  ExternalAlbumBase,
} from '@/types';

import * as musicbrainz from '@/api/musicbrainz';
import { useAlbums } from '@/hooks/albums';
import { useArtists } from '@/hooks/artists';
import { usePlaylists } from '@/hooks/playlists';
import { useApi } from '@/api';
import { useSelector } from 'react-redux';
import { selectSearchScope } from '@/utils/redux/selectors/settingsSelectors';

interface SearchContextType {
  searchResults: SearchResult[];
  searchLibrary: (query: string) => Promise<SearchResult[]>;
  searchExternal: (query: string) => Promise<SearchResult[]>;
  clearSearch: () => void;
  isLoading: boolean;
  handleSearch: (query: string) => Promise<void>;
}

interface SearchProviderProps {
  children: ReactNode;
}

export interface SearchResult {
  id: string;
  title: string;
  subtext: string;
  cover: CoverSource;
  type: 'album' | 'artist' | 'playlist';
  isDownloaded: boolean;
}

const SearchContext = createContext<SearchContextType | undefined>(
  undefined
);

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error(
      'useSearch must be used within a SearchProvider'
    );
  }
  return context;
};

export const SearchProvider: React.FC<SearchProviderProps> = ({
  children,
}) => {
  const api = useApi();
  const { albums } = useAlbums();
  const { artists } = useArtists();
  const { playlists } = usePlaylists();

  const searchScope = useSelector(selectSearchScope);

  const [searchResults, setSearchResults] =
    useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchRequestIdRef = useRef(0);

  const searchLibrary = async (
    query: string
  ): Promise<SearchResult[]> => {
    const lowerQuery = query.toLowerCase();

    const albumResults: SearchResult[] = albums
      .filter(a =>
        a.title.toLowerCase().includes(lowerQuery)
      )
      .map((album: AlbumBase) => ({
        ...album,
        type: 'album',
        isDownloaded: true,
      }));

    const artistResults: SearchResult[] = artists
      .filter(a =>
        a.name.toLowerCase().includes(lowerQuery)
      )
      .map((artist: ArtistBase) => ({
        id: artist.id,
        title: artist.name,
        subtext: artist.subtext,
        cover: artist.cover,
        type: 'artist',
        isDownloaded: true,
      }));

    const playlistResults: SearchResult[] = playlists
      .filter(p =>
        p.title.toLowerCase().includes(lowerQuery)
      )
      .map((playlist: PlaylistBase) => ({
        ...playlist,
        type: 'playlist',
        isDownloaded: true,
      }));

    return [
      ...albumResults,
      ...artistResults,
      ...playlistResults,
    ];
  };

  const searchServer = async (
    query: string
  ): Promise<SearchResult[]> => {
    if (!api?.search) return [];

    const { albums = [] } =
      await api.search.search(query);

    const albumResults: SearchResult[] = albums.map(
      (album: AlbumBase) => ({
        id: album.id,
        title: album.title,
        subtext: album.subtext,
        cover: album.cover,
        type: 'album',
        isDownloaded: true,
      })
    );

    return albumResults;
  };

  const searchExternal = async (
    query: string
  ): Promise<SearchResult[]> => {
    if (!query.trim()) return [];

    try {
      const results: ExternalAlbumBase[] =
        await musicbrainz.searchAlbums(query);

      return results.map(album => ({
        id: album.id,
        title: album.title,
        subtext: album.subtext,
        cover: album.cover,
        type: 'album',
        isDownloaded: false,
      }));
    } catch {
      return [];
    }
  };

  const resultKey = (r: SearchResult) =>
    `${r.type}:${r.id}`;

  const handleSearch = async (query: string) => {
    const requestId = ++searchRequestIdRef.current;

    if (!query.trim()) {
      clearSearch();
      return;
    }

    setIsLoading(true);

    try {
      const lowerQuery = query.toLowerCase();

      const results: SearchResult[] = [];

      if (searchScope === 'client') {
        results.push(...await searchLibrary(query));
      }

      if (searchScope === 'client+external') {
        results.push(
          ...await searchLibrary(query),
          ...await searchExternal(query)
        );
      }

      if (searchScope === 'server') {
        results.push(...await searchServer(query));
      }

      if (searchScope === 'server+external') {
        results.push(
          ...await searchServer(query),
          ...await searchExternal(query)
        );
      }
      const uniqueMap = new Map<string, SearchResult>();

      for (const result of results) {
        const key = resultKey(result);
        const existing = uniqueMap.get(key);

        if (!existing) {
          uniqueMap.set(key, result);
        } else if (
          !existing.isDownloaded &&
          result.isDownloaded
        ) {
          uniqueMap.set(key, result);
        }
      }

      const uniqueResults = Array.from(
        uniqueMap.values()
      );

      uniqueResults.sort((a, b) => {
        if (a.isDownloaded && !b.isDownloaded) return -1;
        if (b.isDownloaded && !a.isDownloaded) return 1;

        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();

        const aExact = aTitle === lowerQuery;
        const bExact = bTitle === lowerQuery;

        if (aExact && !bExact) return -1;
        if (bExact && !aExact) return 1;

        const aIncludes = aTitle.includes(lowerQuery);
        const bIncludes = bTitle.includes(lowerQuery);

        if (aIncludes && !bIncludes) return -1;
        if (bIncludes && !aIncludes) return 1;

        const typePriority = (
          type: SearchResult['type']
        ) =>
          type === 'album'
            ? 1
            : type === 'artist'
              ? 2
              : 3;

        const diff =
          typePriority(a.type) -
          typePriority(b.type);
        if (diff !== 0) return diff;

        return aTitle.localeCompare(bTitle);
      });

      if (requestId !== searchRequestIdRef.current)
        return;

      setSearchResults(uniqueResults.slice(0, 25));
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  };

  const clearSearch = () => {
    setSearchResults([]);
  };

  return (
    <SearchContext.Provider
      value={{
        searchResults,
        searchLibrary,
        searchExternal,
        clearSearch,
        isLoading,
        handleSearch,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};