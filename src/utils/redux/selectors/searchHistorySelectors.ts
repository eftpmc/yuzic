import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/utils/redux/store';
import {
  normalizeSearchHistoryEntries,
  type SearchEntityEntry,
  type SearchHistoryEntry,
  type SearchQueryEntry,
} from '@/utils/redux/slices/searchHistorySlice';

const EMPTY: SearchHistoryEntry[] = [];

export const selectSearchHistoryForActiveServer = createSelector(
  [(s: RootState) => s.searchHistory.byServer, (s: RootState) => s.servers.activeServerId],
  (byServer, activeServerId): SearchHistoryEntry[] => {
    const raw = activeServerId ? byServer[activeServerId] : undefined;
    if (!raw || raw.length === 0) return EMPTY;
    // Guards against pre-migration state that rehydrated as bare strings.
    return normalizeSearchHistoryEntries(raw);
  }
);

export const selectRecentSearchQueries = createSelector(
  [selectSearchHistoryForActiveServer],
  (entries): SearchQueryEntry[] => entries.filter((e): e is SearchQueryEntry => e.kind === 'query')
);

export const selectRecentSearchEntities = createSelector(
  [selectSearchHistoryForActiveServer],
  (entries): SearchEntityEntry[] => entries.filter((e): e is SearchEntityEntry => e.kind === 'entity')
);
