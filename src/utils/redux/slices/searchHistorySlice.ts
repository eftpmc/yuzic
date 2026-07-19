import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface SearchHistoryState {
  byServer: Record<string, string[]>;
}

const initialState: SearchHistoryState = {
  byServer: {},
};

const MAX_ENTRIES = 10;

type ServerRef = { serverId: string };

const searchHistorySlice = createSlice({
  name: 'searchHistory',
  initialState,
  reducers: {
    addSearchQuery(state, action: PayloadAction<ServerRef & { query: string }>) {
      const { serverId, query } = action.payload;
      const trimmed = query.trim();
      if (!trimmed) return;
      const existing = state.byServer[serverId] ?? [];
      const deduped = existing.filter(q => q.toLowerCase() !== trimmed.toLowerCase());
      state.byServer[serverId] = [trimmed, ...deduped].slice(0, MAX_ENTRIES);
    },
    removeSearchQuery(state, action: PayloadAction<ServerRef & { query: string }>) {
      const { serverId, query } = action.payload;
      const existing = state.byServer[serverId];
      if (!existing) return;
      state.byServer[serverId] = existing.filter(q => q !== query);
    },
    clearSearchHistory(state, action: PayloadAction<ServerRef>) {
      state.byServer[action.payload.serverId] = [];
    },
  },
});

export const {
  addSearchQuery,
  removeSearchQuery,
  clearSearchHistory,
} = searchHistorySlice.actions;

export default searchHistorySlice.reducer;
