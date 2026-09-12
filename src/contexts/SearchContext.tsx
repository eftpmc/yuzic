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
} from '@/types';

import * as deezer from '@/api/deezer';
import * as mb from '@/api/musicbrainz';
import { useAlbums } from '@/hooks/albums';
import { useArtists } from '@/hooks/artists';
import { usePlaylists } from '@/hooks/playlists';
import { useIsOffline } from '@/hooks/useIsOffline';
import { useServerUnreachable } from '@/features/connectivity/serverReachability';

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

import { dedupeAndSort, type SearchResult } from './searchRanking';
import { planSearchLegs, type SearchResultScope } from './searchLegs';

export type { SearchResult } from './searchRanking';
export type { SearchResultScope } from './searchLegs';

/** Entity types an external source can be asked to return. Deliberately
 *  narrower than the library's four kinds — 'song'/'playlist' have no
 *  external equivalent through Deezer/MusicBrainz today, so filtering on
 *  them would just always empty out; the Filters UI only offers what a
 *  source actually supports. */
export type SearchEntityType = 'album' | 'artist';

export const ALL_SEARCH_ENTITY_TYPES: SearchEntityType[] = ['album', 'artist'];

export type SearchFilters = {
  /** 'library' (default) — today's local search — or 'other', the
   *  deliberate external-search action. The two are never both attempted
   *  in the same request; that split is what keeps library and external
   *  results from mixing by default. */
  resultScope: SearchResultScope;
  /** Source ids to query when `resultScope` is 'other' — the sources the
   *  Filters sheet left checked, already narrowed to ones enabled for
   *  search. Ignored when `resultScope` is 'library'. */
  sourceIds: string[];
  /** Which entity types to ask each external source for. Defaults to all
   *  supported types when omitted. Ignored when `resultScope` is 'library'. */
  entityTypes?: SearchEntityType[];
};

interface SearchContextType {
  searchResults: SearchResult[];
  searchLibrary: (query: string) => Promise<SearchResult[]>;
  searchExternal: (query: string, sourceIds: string[], entityTypes: SearchEntityType[]) => Promise<SearchResult[]>;
  clearSearch: () => void;
  isLoading: boolean;
  /** True when the most recent search failed to reach the server/external source, so results shown (if any) may be incomplete. */
  hasError: boolean;
  /**
   * True when the remote legs of the search were deliberately skipped because
   * the server can't be reached, so what's shown is the local library only.
   * Distinct from `hasError`: nothing failed, it was never attempted.
   */
  degraded: boolean;
  handleSearchWithFilters: (query: string, filters: SearchFilters) => Promise<void>;
}

interface SearchProviderProps {
  children: ReactNode;
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

/**
 * One external source's contribution to a search, kept provenance-tagged
 * (`externalSource` on every result) rather than merged with any other
 * source's results — see the module doc on `searchExternal` for why.
 */
async function searchExternalSource(
  sourceId: string,
  query: string,
  entityTypes: SearchEntityType[]
): Promise<SearchResult[]> {
  const wantsArtists = entityTypes.includes('artist');
  const wantsAlbums = entityTypes.includes('album');

  if (sourceId === 'deezer') {
    const [artists, albums] = await Promise.all([
      wantsArtists ? deezer.searchDeezerArtists(query, 4) : Promise.resolve([]),
      wantsAlbums ? deezer.searchDeezerAlbums(query, 6) : Promise.resolve([]),
    ]);
    return [
      ...artists.map(artist => artistToResult(artist, false, 'external')),
      ...albums.map(album => albumToResult(album, 'external', false)),
    ];
  }

  if (sourceId === 'musicbrainz') {
    const [artists, releaseGroups] = await Promise.all([
      wantsArtists ? mb.searchArtist(query, 4) : Promise.resolve([]),
      wantsAlbums ? mb.searchReleaseGroupByTitle(query, 6) : Promise.resolve([]),
    ]);
    return [
      ...artists.map(artist => artistToResult(
        { id: artist.id, name: artist.name, subtext: '', cover: { kind: 'none' }, externalSource: 'musicbrainz' },
        false,
        'external'
      )),
      ...releaseGroups.map(rg => albumToResult(
        {
          id: rg.id,
          title: rg.title,
          subtext: rg['first-release-date']?.slice(0, 4) ?? '',
          cover: { kind: 'coverartarchive', mbid: rg.id, mbidType: 'release-group' },
          externalSource: 'musicbrainz',
          externalIds: { mbid: rg.id },
        },
        'external',
        false
      )),
    ];
  }

  return [];
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

  // Whether the remote halves of a search can be attempted at all. Offline is
  // the device having no network; serverUnreachable is the device being online
  // while the music server isn't (VPN down, server rebooting) — the case that
  // otherwise leaves every keystroke hanging until its own timeout.
  const isOffline = useIsOffline();
  const serverUnreachable = useServerUnreachable();
  const canReachServer = !isOffline && !serverUnreachable;
  // External sources are public APIs, so they only need the device to be
  // online — an unreachable *music server* says nothing about whether they're up.
  const canReachExternal = !isOffline;

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
  const [hasError, setHasError] = useState(false);
  const [degraded, setDegraded] = useState(false);

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

  /**
   * Fans a query out to every requested external source in parallel and
   * concatenates the results with each source's own `externalSource` tag
   * intact — this is the "Other sources" leg, never mixed with the library
   * legs above (see `planSearchLegs`).
   *
   * Deliberately does not merge across sources: a MusicBrainz release group
   * and a Deezer album for the same record are two different editions/ids
   * with no shared key to merge on here (no ISRC/UPC cross-match is computed
   * at query time), so collapsing them would either drop a real edition or
   * guess at a match with no confidence signal. Keeping them as separate,
   * source-labelled rows is the conservative choice the locked design calls
   * for ("keep editions/recordings and ambiguous matches separate").
   * `dedupeAndSort`'s existing key (`source:type:id`) still collapses true
   * duplicates — the same source returning the same id twice.
   */
  const searchExternal = useCallback(async (
    query: string,
    sourceIds: string[],
    entityTypes: SearchEntityType[]
  ): Promise<SearchResult[]> => {
    if (!query.trim() || sourceIds.length === 0) return [];
    const perSource = await Promise.all(
      sourceIds.map(sourceId => searchExternalSource(sourceId, query, entityTypes))
    );
    return perSource.flat();
  }, []);

  const clearSearch = useCallback(() => {
    searchRequestIdRef.current += 1;
    setSearchResults([]);
    setIsLoading(false);
    setHasError(false);
    setDegraded(false);
  }, []);

  const handleSearchWithFilters = useCallback(async (query: string, filters: SearchFilters) => {
    const requestId = ++searchRequestIdRef.current;
    if (!query.trim()) {
      setSearchResults([]);
      setIsLoading(false);
      setHasError(false);
      setDegraded(false);
      return;
    }
    setIsLoading(true);
    let errored = false;
    try {
      const lowerQuery = query.toLowerCase();
      const results: SearchResult[] = [];
      const entityTypes = filters.entityTypes ?? ['album', 'artist'];

      // Decide the legs up front rather than at each call site. A leg that
      // cannot land is not attempted at all: each one would otherwise hang to
      // its own timeout on every keystroke and then land in the same `catch`
      // as a real failure, so local results that succeeded were shown
      // underneath an error banner. Library and external legs are mutually
      // exclusive here — `resultScope` picks one family, never both.
      const legs = planSearchLegs({
        resultScope: filters.resultScope,
        enabledExternalSourceIds: filters.sourceIds,
        searchScope,
        serverReachable: canReachServer,
        deviceOnline: canReachExternal,
      });

      if (legs.client) {
        results.push(...await searchLibrary(query));
      }
      if (requestId !== searchRequestIdRef.current) return;

      if (legs.server) {
        try { results.push(...await searchServer(query)); } catch { errored = true; }
      }
      if (requestId !== searchRequestIdRef.current) return;

      if (legs.externalSources.length > 0) {
        try { results.push(...await searchExternal(query, legs.externalSources, entityTypes)); } catch { errored = true; }
      }
      if (requestId !== searchRequestIdRef.current) return;

      setSearchResults(dedupeAndSort(results, lowerQuery));
      setHasError(errored);
      setDegraded(legs.degraded);
    } finally {
      if (requestId === searchRequestIdRef.current) setIsLoading(false);
    }
  }, [
    canReachExternal,
    canReachServer,
    searchExternal,
    searchLibrary,
    searchScope,
    searchServer,
  ]);

  const value = useMemo<SearchContextType>(() => ({
    searchResults,
    searchLibrary,
    searchExternal,
    clearSearch,
    isLoading,
    hasError,
    degraded,
    handleSearchWithFilters,
  }), [
    searchResults,
    searchLibrary,
    searchExternal,
    clearSearch,
    isLoading,
    hasError,
    degraded,
    handleSearchWithFilters,
  ]);

  return (
    <SearchContext.Provider value={value}>
      {children}
    </SearchContext.Provider>
  );
};
