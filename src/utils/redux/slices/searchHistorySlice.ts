import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CoverSource } from '@/types';

export type SearchEntityType = 'song' | 'album' | 'artist' | 'playlist';

export interface SearchHistoryExternalIds {
  deezerId?: string;
  artistDeezerId?: string;
  mbid?: string | null;
  artistMbid?: string | null;
  upc?: string | null;
  isrc?: string | null;
}

/** Something the user typed and submitted. Replaying it re-runs the search. */
export interface SearchQueryEntry {
  kind: 'query';
  text: string;
}

/**
 * Something the user actually opened from the results. Carries enough detail to
 * render artwork and to navigate straight to the item without searching again.
 */
export interface SearchEntityEntry {
  kind: 'entity';
  type: SearchEntityType;
  id: string;
  title: string;
  subtitle: string;
  cover: CoverSource;
  source: 'local' | 'external';
  externalSource?: 'deezer' | 'musicbrainz' | 'lastfm';
  externalIds?: SearchHistoryExternalIds;
}

export type SearchHistoryEntry = SearchQueryEntry | SearchEntityEntry;

export interface SearchHistoryState {
  byServer: Record<string, SearchHistoryEntry[]>;
}

const initialState: SearchHistoryState = {
  byServer: {},
};

// Capped per kind rather than over the combined list, so a run of opened albums
// can't evict every typed query (and vice versa).
export const MAX_QUERY_ENTRIES = 10;
export const MAX_ENTITY_ENTRIES = 12;

/** Stable identity for dedupe and removal. Queries match case-insensitively. */
export const searchHistoryEntryKey = (entry: SearchHistoryEntry): string =>
  entry.kind === 'query'
    ? `query:${entry.text.toLowerCase()}`
    : `entity:${entry.type}:${entry.id}`;

const ENTITY_TYPES: SearchEntityType[] = ['song', 'album', 'artist', 'playlist'];

/**
 * Coerces persisted history into the current shape. Entries written before
 * entity history existed are bare query strings; anything unrecognisable is
 * dropped rather than allowed to crash a render.
 */
export const normalizeSearchHistoryEntries = (raw: unknown): SearchHistoryEntry[] => {
  if (!Array.isArray(raw)) return [];
  const entries: SearchHistoryEntry[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const text = item.trim();
      if (text) entries.push({ kind: 'query', text });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const entry = item as Partial<SearchEntityEntry> & Partial<SearchQueryEntry>;
    if (entry.kind === 'query') {
      const text = typeof entry.text === 'string' ? entry.text.trim() : '';
      if (text) entries.push({ kind: 'query', text });
      continue;
    }
    if (
      entry.kind === 'entity' &&
      typeof entry.id === 'string' &&
      entry.id &&
      typeof entry.title === 'string' &&
      entry.type &&
      ENTITY_TYPES.includes(entry.type)
    ) {
      entries.push(entry as SearchEntityEntry);
    }
  }
  return entries;
};

const capPerKind = (entries: SearchHistoryEntry[]): SearchHistoryEntry[] => {
  let queries = 0;
  let entities = 0;
  return entries.filter(entry => {
    if (entry.kind === 'query') return ++queries <= MAX_QUERY_ENTRIES;
    return ++entities <= MAX_ENTITY_ENTRIES;
  });
};

const prepend = (existing: SearchHistoryEntry[], entry: SearchHistoryEntry): SearchHistoryEntry[] => {
  const key = searchHistoryEntryKey(entry);
  return capPerKind([entry, ...existing.filter(e => searchHistoryEntryKey(e) !== key)]);
};

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
      state.byServer[serverId] = prepend(existing, { kind: 'query', text: trimmed });
    },
    addSearchEntity(state, action: PayloadAction<ServerRef & { entity: Omit<SearchEntityEntry, 'kind'> }>) {
      const { serverId, entity } = action.payload;
      if (!entity.id || !entity.title.trim()) return;
      const existing = state.byServer[serverId] ?? [];
      state.byServer[serverId] = prepend(existing, { ...entity, kind: 'entity' });
    },
    removeSearchEntry(state, action: PayloadAction<ServerRef & { key: string }>) {
      const { serverId, key } = action.payload;
      const existing = state.byServer[serverId];
      if (!existing) return;
      state.byServer[serverId] = existing.filter(e => searchHistoryEntryKey(e) !== key);
    },
    clearSearchHistory(state, action: PayloadAction<ServerRef>) {
      state.byServer[action.payload.serverId] = [];
    },
  },
});

export const {
  addSearchQuery,
  addSearchEntity,
  removeSearchEntry,
  clearSearchHistory,
} = searchHistorySlice.actions;

export default searchHistorySlice.reducer;
