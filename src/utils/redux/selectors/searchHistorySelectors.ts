import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/utils/redux/store';

const EMPTY: string[] = [];

export const selectSearchHistoryForActiveServer = createSelector(
  [(s: RootState) => s.searchHistory.byServer, (s: RootState) => s.servers.activeServerId],
  (byServer, activeServerId): string[] =>
    (activeServerId ? byServer[activeServerId] ?? EMPTY : EMPTY)
);
