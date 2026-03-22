import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useRef,
} from 'react';
import {
  Album,
  Artist,
  Playlist,
  CoverSource,
  ExternalAlbumBase,
  Song,
  SongBase,
} from '@/types';

import * as musicbrainz from '@/api/musicbrainz';
import { useAlbums } from '@/hooks/albums';
import { useArtists } from '@/hooks/artists';
import { usePlaylists } from '@/hooks/playlists';
import { useFullPlaylists } from '@/hooks/playlists';
import { useTracks } from '@/hooks/tracks';
import { useApi } from '@/api';
import { useSelector } from 'react-redux';
import {
  selectSearchScope,
} from '@/utils/redux/selectors/settingsSelectors';
import { useDownloadedTracks } from 'react-native-nitro-player';
import {
  buildDownloadedTrackIdSet,
  getFullyDownloadedAlbumIds,
  isPlaylistFullyDownloaded,
} from '@/utils/downloads/collectionState';

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
  type: 'song' | 'album' | 'artist' | 'playlist';
  source: 'local' | 'external';
  isDownloaded: boolean;
  song?: Song;
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
  const { playlists: fullPlaylists } = useFullPlaylists(playlists);
  const { tracks } = useTracks();
  const downloadedState = useDownloadedTracks() as any;
  const downloadedTrackIds = buildDownloadedTrackIdSet(
    ((downloadedState?.downloadedTracks ?? []) as any[])
      .map(track => ({ id: String(track?.trackId ?? track?.originalTrack?.id ?? '') }))
      .filter(track => track.id)
  );
  const downloadedAlbumIds = getFullyDownloadedAlbumIds(
    tracks.map(track => ({ id: track.id, albumId: track.albumId })),
    downloadedTrackIds
  );
  const downloadedPlaylistIds = new Set(
    fullPlaylists
      .filter(playlist => isPlaylistFullyDownloaded(playlist, downloadedTrackIds))
      .map(playlist => playlist.id)
  );

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
      .map((album: Album) => ({
        ...album,
        type: 'album',
        source: 'local',
        isDownloaded: downloadedAlbumIds.has(album.id),
      }));

    const artistResults: SearchResult[] = artists
      .filter(a =>
        a.name.toLowerCase().includes(lowerQuery)
      )
      .map((artist: Artist) => ({
        id: artist.id,
        title: artist.name,
        subtext: artist.subtext,
        cover: artist.cover,
        type: 'artist',
        source: 'local',
        isDownloaded: true,
      }));

    const playlistResults: SearchResult[] = playlists
      .filter(p =>
        p.title.toLowerCase().includes(lowerQuery)
      )
      .map((playlist: Playlist) => ({
        ...playlist,
        type: 'playlist',
        source: 'local',
        isDownloaded: downloadedPlaylistIds.has(playlist.id),
      }));

    const songResults: SearchResult[] = tracks
      .filter(track => {
        const title = track.title.toLowerCase();
        const artist = (track.artist ?? '').toLowerCase();
        return (
          title.includes(lowerQuery) ||
          artist.includes(lowerQuery)
        );
      })
      .map((track: SongBase) => ({
        id: track.id,
        title: track.title,
        subtext: track.artist,
        cover: track.cover,
        type: 'song',
        source: 'local',
        isDownloaded: downloadedTrackIds.has(track.id),
      }));

    return [
      ...songResults,
      ...albumResults,
      ...artistResults,
      ...playlistResults,
    ];
  };

  const searchServer = async (
    query: string
  ): Promise<SearchResult[]> => {
    if (!api?.search) return [];

    const { albums = [], artists = [], songs = [] } =
      await api.search.search(query);

    const albumResults: SearchResult[] = albums.map(
      (album: Album) => ({
        id: album.id,
        title: album.title,
        subtext: album.subtext,
        cover: album.cover,
        type: 'album',
        source: 'local',
        isDownloaded: true,
      })
    );

    const artistResults: SearchResult[] = artists.map(
      (artist: Artist) => ({
        id: artist.id,
        title: artist.name,
        subtext: artist.subtext,
        cover: artist.cover,
        type: 'artist',
        source: 'local',
        isDownloaded: true,
      })
    );

    const songResults: SearchResult[] = songs.map(
      (song: Song) => ({
        id: song.id,
        title: song.title,
        subtext: song.artist,
        cover: song.cover,
        type: 'song',
        source: 'local',
        isDownloaded: true,
        song,
      })
    );

    return [...songResults, ...albumResults, ...artistResults];
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
        source: 'external',
        isDownloaded: false,
      }));
    } catch {
      return [];
    }
  };

  const resultKey = (r: SearchResult) =>
    `${r.source}:${r.type}:${r.id}`;

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

      if (searchScope.includes('client')) results.push(...await searchLibrary(query));
      if (searchScope.includes('server')) results.push(...await searchServer(query));
      if (searchScope.includes('external')) results.push(...await searchExternal(query));
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
        const sourcePriority = (
          source: SearchResult['source']
        ) => (source === 'local' ? 1 : 2);
        const sourceDiff =
          sourcePriority(a.source) -
          sourcePriority(b.source);
        if (sourceDiff !== 0) return sourceDiff;

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
          type === 'song'
            ? 1
            : type === 'album'
              ? 2
              : type === 'artist'
                ? 3
                : 4;

        const diff =
          typePriority(a.type) -
          typePriority(b.type);
        if (diff !== 0) return diff;

        return aTitle.localeCompare(bTitle);
      });

      if (requestId !== searchRequestIdRef.current)
        return;

      setSearchResults(uniqueResults.slice(0, 50));
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
