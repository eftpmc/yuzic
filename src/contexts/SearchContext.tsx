import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  ReactNode,
  useRef,
} from 'react';
import {
  AlbumBase,
  Artist,
  PlaylistBase,
  CoverSource,
  Song,
  SongBase,
} from '@/types';

import * as deezer from '@/api/deezer';
import { useAlbums } from '@/hooks/albums';
import { useArtists } from '@/hooks/artists';
import { usePlaylists } from '@/hooks/playlists';

import { useTracks } from '@/hooks/tracks';
import { useApi } from '@/api';
import { useSelector } from 'react-redux';
import {
  selectSearchScope,
} from '@/utils/redux/selectors/settingsSelectors';
import { useDownload } from '@/contexts/DownloadContext';
import {
  buildDownloadedTrackIdSet,
  getFullyDownloadedAlbumIds,
} from '@/utils/downloads/collectionState';

export type SearchFilters = {
  local: boolean;
  deezer: boolean;
}

interface SearchContextType {
  searchResults: SearchResult[];
  searchLibrary: (query: string) => Promise<SearchResult[]>;
  searchExternal: (query: string) => Promise<SearchResult[]>;
  clearSearch: () => void;
  isLoading: boolean;
  handleSearch: (query: string) => Promise<void>;
  handleSearchWithFilters: (query: string, filters: SearchFilters) => Promise<void>;
}

interface SearchProviderProps {
  children: ReactNode;
}

export interface SearchResult {
  id: string;
  title: string;
  subtext: string;
  cover: CoverSource;
  type: 'song' | 'album' | 'artist' | 'playlist';
  source: 'local' | 'external';
  externalSource?: 'deezer' | 'musicbrainz' | 'lastfm';
  externalIds?: {
    deezerId?: string;
    artistDeezerId?: string;
    mbid?: string | null;
    artistMbid?: string | null;
    upc?: string | null;
    isrc?: string | null;
  };
  isDownloaded: boolean;
  song?: Song;
}

// --- result mapping helpers ---

function albumToResult(
  album: {
    id: string;
    title: string;
    subtext: string;
    cover: CoverSource;
    externalSource?: SearchResult['externalSource'];
    externalIds?: SearchResult['externalIds'];
  },
  source: SearchResult['source'],
  isDownloaded: boolean
): SearchResult {
  return {
    id: album.id,
    title: album.title,
    subtext: album.subtext,
    cover: album.cover,
    type: 'album',
    source,
    externalSource: album.externalSource,
    externalIds: album.externalIds,
    isDownloaded,
  };
}

function artistToResult(
  artist: Artist | {
    id: string;
    name: string;
    subtext: string;
    cover: CoverSource;
    externalSource?: SearchResult['externalSource'];
    externalIds?: SearchResult['externalIds'];
  },
  isDownloaded = true,
  source: SearchResult['source'] = 'local'
): SearchResult {
  return {
    id: artist.id,
    title: artist.name,
    subtext: artist.subtext,
    cover: artist.cover,
    type: 'artist',
    source,
    externalSource: 'externalSource' in artist ? artist.externalSource : undefined,
    externalIds: 'externalIds' in artist ? artist.externalIds : undefined,
    isDownloaded,
  };
}

function songToResult(
  song: { id: string; title: string; artist: string; cover: CoverSource },
  isDownloaded: boolean,
  fullSong?: Song
): SearchResult {
  return {
    id: song.id,
    title: song.title,
    subtext: song.artist,
    cover: song.cover,
    type: 'song',
    source: 'local',
    isDownloaded,
    ...(fullSong ? { song: fullSong } : {}),
  };
}

function playlistToResult(playlist: PlaylistBase, isDownloaded: boolean): SearchResult {
  return {
    id: playlist.id,
    title: playlist.title,
    subtext: playlist.subtext,
    cover: playlist.cover,
    type: 'playlist',
    source: 'local',
    isDownloaded,
  };
}

// ---

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
  const { tracks } = useTracks();

  const searchScope = useSelector(selectSearchScope);

  const {
    downloadedTracks,
    getAllDownloadedCollections,
  } = useDownload();

  const downloadedTrackIds = useMemo(
    () => buildDownloadedTrackIdSet(
      downloadedTracks
        .map(track => ({ id: String(track.trackId ?? track.originalTrack?.id ?? '') }))
        .filter(track => track.id)
    ),
    [downloadedTracks]
  );

  const downloadedAlbumIds = useMemo(
    () => getFullyDownloadedAlbumIds(
      tracks.map(track => ({ id: track.id, albumId: track.albumId })),
      downloadedTrackIds
    ),
    [tracks, downloadedTrackIds]
  );

  const downloadedPlaylistIds = useMemo(
    () => new Set(
      getAllDownloadedCollections()
        .filter(collection => collection.type === 'playlist')
        .map(collection => String(collection.id))
    ),
    [getAllDownloadedCollections]
  );

  const [searchResults, setSearchResults] =
    useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const searchRequestIdRef = useRef(0);

  // Pre-compute lowercased strings once when library data changes, not on every keystroke.
  // With 9000 tracks this avoids 18,000 toLowerCase() calls per search query.
  const searchIndex = useMemo(() => ({
    tracks: tracks.map(t => ({ item: t, lc: `${t.title.toLowerCase()} ${(t.artist ?? '').toLowerCase()}` })),
    albums: albums.map(a => ({ item: a, lc: a.title.toLowerCase() })),
    artists: artists.map(a => ({ item: a, lc: a.name.toLowerCase() })),
    playlists: playlists.map(p => ({ item: p, lc: p.title.toLowerCase() })),
  }), [tracks, albums, artists, playlists]);

  const searchLibrary = useCallback(async (
    query: string
  ): Promise<SearchResult[]> => {
    const lowerQuery = query.toLowerCase();

    const albumResults = searchIndex.albums
      .filter(({ lc }) => lc.includes(lowerQuery))
      .slice(0, 5)
      .map(({ item }) =>
        albumToResult(item, 'local', downloadedAlbumIds.has(item.id))
      );

    const artistResults = searchIndex.artists
      .filter(({ lc }) => lc.includes(lowerQuery))
      .slice(0, 3)
      .map(({ item }) => artistToResult(item));

    const playlistResults = searchIndex.playlists
      .filter(({ lc }) => lc.includes(lowerQuery))
      .slice(0, 3)
      .map(({ item }) =>
        playlistToResult(item, downloadedPlaylistIds.has(item.id))
      );

    const songResults = searchIndex.tracks
      .filter(({ lc }) => lc.includes(lowerQuery))
      .slice(0, 5)
      .map(({ item }) =>
        songToResult(item, downloadedTrackIds.has(item.id))
      );

    return [
      ...songResults,
      ...albumResults,
      ...artistResults,
      ...playlistResults,
    ];
  }, [
    searchIndex,
    downloadedAlbumIds,
    downloadedPlaylistIds,
    downloadedTrackIds,
  ]);

  const searchServer = useCallback(async (
    query: string
  ): Promise<SearchResult[]> => {
    if (!api?.search) return [];

    const { albums = [], artists = [], songs = [] } =
      await api.search.search(query);

    return [
      ...songs.map((song: Song) => songToResult(song, downloadedTrackIds.has(song.id), song)),
      ...albums.map((album: AlbumBase) => albumToResult(album, 'local', downloadedAlbumIds.has(album.id))),
      ...artists.map((artist: Artist) => artistToResult(artist)),
    ];
  }, [api, downloadedAlbumIds, downloadedTrackIds]);

  const searchExternal = useCallback(async (
    query: string
  ): Promise<SearchResult[]> => {
    if (!query.trim()) return [];

    try {
      const [deezerArtists, deezerAlbums] = await Promise.all([
        deezer.searchDeezerArtists(query, 4),
        deezer.searchDeezerAlbums(query, 6),
      ]);

      return [
        ...deezerArtists.map(artist => artistToResult(artist, false, 'external')),
        ...deezerAlbums.map(album => albumToResult(album, 'external', false)),
      ];
    } catch {
      return [];
    }
  }, []);

  const resultKey = (r: SearchResult) =>
    `${r.source}:${r.type}:${r.id}`;

  function dedupeAndSort(results: SearchResult[], lowerQuery: string): SearchResult[] {
    const uniqueMap = new Map<string, SearchResult>();
    for (const result of results) {
      const key = resultKey(result);
      const existing = uniqueMap.get(key);
      if (!existing) {
        uniqueMap.set(key, result);
      } else if (!existing.isDownloaded && result.isDownloaded) {
        uniqueMap.set(key, result);
      }
    }
    const unique: SearchResult[] = [];
    uniqueMap.forEach(v => unique.push(v));
    unique.sort((a, b) => {
      const sourceDiff = (a.source === 'local' ? 1 : 2) - (b.source === 'local' ? 1 : 2);
      if (sourceDiff !== 0) return sourceDiff;
      if (a.isDownloaded && !b.isDownloaded) return -1;
      if (b.isDownloaded && !a.isDownloaded) return 1;
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      if (aTitle === lowerQuery && bTitle !== lowerQuery) return -1;
      if (bTitle === lowerQuery && aTitle !== lowerQuery) return 1;
      if (aTitle.includes(lowerQuery) && !bTitle.includes(lowerQuery)) return -1;
      if (bTitle.includes(lowerQuery) && !aTitle.includes(lowerQuery)) return 1;
      const typePriority = (type: SearchResult['type']) =>
        type === 'song' ? 1 : type === 'album' ? 2 : type === 'artist' ? 3 : 4;
      const diff = typePriority(a.type) - typePriority(b.type);
      if (diff !== 0) return diff;
      return aTitle.localeCompare(bTitle);
    });
    return unique;
  }

  const clearSearch = useCallback(() => {
    searchRequestIdRef.current += 1;
    setSearchResults([]);
    setIsLoading(false);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    const requestId = ++searchRequestIdRef.current;

    if (!query.trim()) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const lowerQuery = query.toLowerCase();
      const results: SearchResult[] = [];

      if (searchScope.includes('client')) {
        results.push(...await searchLibrary(query));
      }
      if (requestId !== searchRequestIdRef.current) return;

      if (searchScope.includes('server')) {
        try {
          results.push(...await searchServer(query));
        } catch {}
      }
      if (requestId !== searchRequestIdRef.current) return;

      if (searchScope.includes('external')) {
        try {
          results.push(...await searchExternal(query));
        } catch {}
      }
      if (requestId !== searchRequestIdRef.current) return;

      setSearchResults(dedupeAndSort(results, lowerQuery));
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [searchExternal, searchLibrary, searchScope, searchServer]);

  const handleSearchWithFilters = useCallback(async (query: string, filters: SearchFilters) => {
    const requestId = ++searchRequestIdRef.current;
    if (!query.trim()) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const lowerQuery = query.toLowerCase();
      const results: SearchResult[] = [];

      if (filters.local) {
        if (searchScope.includes('client')) {
          results.push(...await searchLibrary(query));
        }
        if (requestId !== searchRequestIdRef.current) return;
        if (searchScope.includes('server')) {
          try { results.push(...await searchServer(query)); } catch {}
        }
        if (requestId !== searchRequestIdRef.current) return;
      }

      if (filters.deezer) {
        try { results.push(...await searchExternal(query)); } catch {}
      }
      if (requestId !== searchRequestIdRef.current) return;

      setSearchResults(dedupeAndSort(results, lowerQuery));
    } finally {
      if (requestId === searchRequestIdRef.current) setIsLoading(false);
    }
  }, [searchExternal, searchLibrary, searchScope, searchServer]);

  const value = useMemo<SearchContextType>(() => ({
    searchResults,
    searchLibrary,
    searchExternal,
    clearSearch,
    isLoading,
    handleSearch,
    handleSearchWithFilters,
  }), [
    searchResults,
    searchLibrary,
    searchExternal,
    clearSearch,
    isLoading,
    handleSearch,
    handleSearchWithFilters,
  ]);

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};
