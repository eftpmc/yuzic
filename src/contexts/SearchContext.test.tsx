import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

import { SearchProvider, useSearch } from './SearchContext';

// Library data hooks — enough of a shape for SearchContext to build its
// lowercased search index over.
jest.mock('@/hooks/albums', () => ({
  useAlbums: () => ({ albums: [] }),
}));
jest.mock('@/hooks/artists', () => ({
  useArtists: () => ({ artists: [] }),
}));
jest.mock('@/hooks/playlists', () => ({
  usePlaylists: () => ({ playlists: [] }),
}));
jest.mock('@/hooks/tracks', () => ({
  useTracks: () => ({ tracks: [] }),
}));

jest.mock('@/api', () => ({
  useApi: () => ({ search: { search: jest.fn().mockResolvedValue({ albums: [], artists: [], songs: [] }) } }),
}));

jest.mock('@/contexts/DownloadContext', () => ({
  useDownload: () => ({
    downloadedTracks: [],
    getAllDownloadedCollections: () => [],
  }),
}));

let mockIsOffline = false;
jest.mock('@/hooks/useIsOffline', () => ({
  useIsOffline: () => mockIsOffline,
}));

let mockServerUnreachable = false;
jest.mock('@/features/connectivity/serverReachability', () => ({
  useServerUnreachable: () => mockServerUnreachable,
}));

const mockSearchDeezerArtists = jest.fn().mockResolvedValue([]);
const mockSearchDeezerAlbums = jest.fn().mockResolvedValue([
  { id: 'dz-1', title: 'Rumours', subtext: '1977', artist: 'Fleetwood Mac', cover: { kind: 'none' }, externalSource: 'deezer', externalIds: { deezerId: 'dz-1' } },
]);
jest.mock('@/api/deezer', () => ({
  searchDeezerArtists: (...args: unknown[]) => mockSearchDeezerArtists(...args),
  searchDeezerAlbums: (...args: unknown[]) => mockSearchDeezerAlbums(...args),
}));

const mockSearchArtist = jest.fn().mockResolvedValue([]);
const mockSearchReleaseGroupByTitle = jest.fn().mockResolvedValue([
  { id: 'mb-1', title: 'Rumours', 'first-release-date': '1977-02-04' },
]);
jest.mock('@/api/musicbrainz', () => ({
  searchArtist: (...args: unknown[]) => mockSearchArtist(...args),
  searchReleaseGroupByTitle: (...args: unknown[]) => mockSearchReleaseGroupByTitle(...args),
}));

let mockSearchScope: 'client' | 'server' = 'server';
jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({
    settings: { searchScope: mockSearchScope },
  }),
}));
jest.mock('@/utils/redux/selectors/settingsSelectors', () => ({
  selectSearchScope: (s: { settings: { searchScope: string } }) => s.settings.searchScope,
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <SearchProvider>{children}</SearchProvider>;
}

describe('SearchContext handleSearchWithFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsOffline = false;
    mockServerUnreachable = false;
    mockSearchDeezerArtists.mockResolvedValue([]);
    mockSearchDeezerAlbums.mockResolvedValue([
      { id: 'dz-1', title: 'Rumours', subtext: '1977', artist: 'Fleetwood Mac', cover: { kind: 'none' }, externalSource: 'deezer', externalIds: { deezerId: 'dz-1' } },
    ]);
    mockSearchArtist.mockResolvedValue([]);
    mockSearchReleaseGroupByTitle.mockResolvedValue([
      { id: 'mb-1', title: 'Rumours', 'first-release-date': '1977-02-04' },
    ]);
  });

  it('never calls an external source for the default library scope', async () => {
    const { result } = await renderHook(() => useSearch(), { wrapper });

    await act(async () => {
      await result.current.handleSearchWithFilters('rumours', {
        resultScope: 'library',
        sourceIds: ['deezer'],
      });
    });

    expect(mockSearchDeezerAlbums).not.toHaveBeenCalled();
    expect(mockSearchReleaseGroupByTitle).not.toHaveBeenCalled();
    // Only the library/server leg's results, never external ones.
    expect(result.current.searchResults.every(r => r.source === 'local')).toBe(true);
  });

  it('queries the enabled source when scope is "other"', async () => {
    const { result } = await renderHook(() => useSearch(), { wrapper });

    await act(async () => {
      await result.current.handleSearchWithFilters('rumours', {
        resultScope: 'other',
        sourceIds: ['deezer'],
      });
    });

    expect(mockSearchDeezerAlbums).toHaveBeenCalledWith('rumours', 6);
    expect(mockSearchReleaseGroupByTitle).not.toHaveBeenCalled();
  });

  it('never mixes library and external results in one response', async () => {
    const { result } = await renderHook(() => useSearch(), { wrapper });

    await act(async () => {
      await result.current.handleSearchWithFilters('rumours', {
        resultScope: 'other',
        sourceIds: ['deezer'],
      });
    });

    expect(result.current.searchResults.length).toBeGreaterThan(0);
    expect(result.current.searchResults.every(r => r.source === 'external')).toBe(true);
  });

  it('preserves provenance per source and keeps editions from different sources separate', async () => {
    const { result } = await renderHook(() => useSearch(), { wrapper });

    await act(async () => {
      await result.current.handleSearchWithFilters('rumours', {
        resultScope: 'other',
        sourceIds: ['deezer', 'musicbrainz'],
      });
    });

    const sources = result.current.searchResults.map(r => r.externalSource);
    expect(sources).toContain('deezer');
    expect(sources).toContain('musicbrainz');
    // Two distinct records for the same album title, one per source — not
    // collapsed into a single merged row.
    expect(result.current.searchResults.filter(r => r.type === 'album')).toHaveLength(2);
  });

  it("the Filters selection limits which sources are queried", async () => {
    const { result } = await renderHook(() => useSearch(), { wrapper });

    await act(async () => {
      await result.current.handleSearchWithFilters('rumours', {
        resultScope: 'other',
        sourceIds: ['musicbrainz'],
      });
    });

    expect(mockSearchDeezerAlbums).not.toHaveBeenCalled();
    expect(mockSearchReleaseGroupByTitle).toHaveBeenCalled();
  });

  it('the Filters entity-type selection limits which entity types are asked for', async () => {
    const { result } = await renderHook(() => useSearch(), { wrapper });

    await act(async () => {
      await result.current.handleSearchWithFilters('rumours', {
        resultScope: 'other',
        sourceIds: ['deezer'],
        entityTypes: ['artist'],
      });
    });

    expect(mockSearchDeezerAlbums).not.toHaveBeenCalled();
  });

  it('marks external results as degraded rather than errored when offline', async () => {
    mockIsOffline = true;
    const { result } = await renderHook(() => useSearch(), { wrapper });

    await act(async () => {
      await result.current.handleSearchWithFilters('rumours', {
        resultScope: 'other',
        sourceIds: ['deezer'],
      });
    });

    expect(mockSearchDeezerAlbums).not.toHaveBeenCalled();
    expect(result.current.degraded).toBe(true);
    expect(result.current.hasError).toBe(false);
  });

  it('does nothing for an empty query', async () => {
    const { result } = await renderHook(() => useSearch(), { wrapper });

    await act(async () => {
      await result.current.handleSearchWithFilters('   ', {
        resultScope: 'other',
        sourceIds: ['deezer'],
      });
    });

    expect(mockSearchDeezerAlbums).not.toHaveBeenCalled();
    expect(result.current.searchResults).toEqual([]);
  });

  it('falls back to the local index for the library scope when the server is unreachable', async () => {
    mockServerUnreachable = true;
    mockSearchScope = 'server';
    const { result } = await renderHook(() => useSearch(), { wrapper });

    await act(async () => {
      await result.current.handleSearchWithFilters('rumours', {
        resultScope: 'library',
        sourceIds: [],
      });
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.degraded).toBe(true);
  });
});
