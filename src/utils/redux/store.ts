import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import { reduxStorage as storage } from '@/utils/mmkvStorage';

import serversReducer from './slices/serversSlice';
import downloadersReducer from './slices/downloadersSlice';
import audiomuseReducer from './slices/audiomuseSlice';
import settingsReducer from './slices/settingsSlice';
import listenbrainzReducer from './slices/listenbrainzSlice';
import playbackReducer from './slices/playbackSlice';
import statsReducer from './slices/statsSlice';
import libraryReducer from './slices/librarySlice';
import libraryStarredReducer from './slices/libraryStarredSlice';
import offlineMutationsReducer from './slices/offlineMutationsSlice';
import searchHistoryReducer, { normalizeSearchHistoryEntries } from './slices/searchHistorySlice';

// Returns undefined (→ initialState) only on version bump; otherwise passes state through.
const resetMigrate = (state: any, currentVersion: number): Promise<any> => {
  if (state?._persist?.version === currentVersion) return Promise.resolve(state);
  return Promise.resolve(undefined as any);
};

// Patches specific fields on version bump while preserving all other user settings.
const settingsMigrate = (state: any, currentVersion: number): Promise<any> => {
  if (state?._persist?.version === currentVersion) return Promise.resolve(state);
  const scope = state?.searchScope;
  const migratedScope =
    scope === 'client+external' ? 'client' :
    scope === 'server+external' ? 'server' :
    scope ?? 'server';

  // v3 strips the sub-toggle fields the consolidation pass retired
  // (now-playing follows scrobble, Deezer sub-features follow discovery).
  // Leaving them in the persisted payload keeps the redux state carrying
  // dead keys forever, and any code that later resurrects a `deezerSamples-
  // Enabled` field for a different purpose would read a stale value.
  const {
    serverNowPlayingEnabled: _snp,
    deezerTopTracksEnabled: _dtt,
    deezerSimilarArtistsEnabled: _dsa,
    deezerAlbumRecommendationsEnabled: _dar,
    deezerSamplesEnabled: _ds,
    deezerPlaylistRecommendationsEnabled: _dpr,
    ...cleaned
  } = state ?? {};

  return Promise.resolve({
    ...cleaned,
    syncOnAppStart: true,
    searchScope: migratedScope,
  });
};

// v1 gave history entries a shape (query vs. opened entity); before that each
// entry was a bare query string. Lift the old strings instead of dropping them.
const searchHistoryMigrate = (state: any, currentVersion: number): Promise<any> => {
  if (state?._persist?.version === currentVersion) return Promise.resolve(state);
  const byServer = state?.byServer;
  if (!byServer) return Promise.resolve(state);
  const migrated: Record<string, unknown> = {};
  for (const [serverId, entries] of Object.entries(byServer)) {
    migrated[serverId] = normalizeSearchHistoryEntries(entries);
  }
  return Promise.resolve({ ...state, byServer: migrated });
};

const serversPersistConfig = { key: 'servers', storage };
const downloadersPersistConfig = { key: 'downloaders', storage };
const audiomusePersistConfig = { key: 'audiomuse', storage };
const settingsPersistConfig = {
  key: 'settings',
  storage,
  version: 3,
  migrate: settingsMigrate,
};
// Strips the per-server nowPlayingEnabled key the consolidation pass
// retired — same reasoning as the settings v3 migration.
const listenbrainzMigrate = (state: any, currentVersion: number): Promise<any> => {
  if (state?._persist?.version === currentVersion) return Promise.resolve(state);
  const byServer = state?.byServer;
  if (!byServer) return Promise.resolve(state);
  const cleaned: Record<string, any> = {};
  for (const [serverId, entry] of Object.entries(byServer)) {
    const { nowPlayingEnabled: _np, ...rest } = (entry as any) ?? {};
    cleaned[serverId] = rest;
  }
  return Promise.resolve({ ...state, byServer: cleaned });
};

const listenbrainzPersistConfig = {
  key: 'listenbrainz',
  storage,
  version: 1,
  migrate: listenbrainzMigrate,
};
// Playback is written on every track change and (throttled) every few seconds
// during play; a wipe on version bump is fine — the loss is at most whatever
// was mid-play when the app got the update.
const playbackPersistConfig = { key: 'playback', storage, throttle: 3000 };
const offlineMutationsPersistConfig = { key: 'offlineMutations', storage };
const searchHistoryPersistConfig = {
  key: 'searchHistory',
  storage,
  version: 1,
  migrate: searchHistoryMigrate,
};

// Persist throttling. redux-persist writes on every dispatched action that
// mutates the slice; for slices that carry thousands of entries (library) or
// change on every second (playback), that's a JSON.stringify + MMKV write per
// action — measurable on cold-boot and playback. Throttling batches writes
// without changing any consumer's behavior.
//
//   library / libraryStarred: 1s — sync writes update every album/track in a
//     single tick, so 1s covers a full sync.
//   playback: 3s — the position tick is throttled inside
//     usePlaybackPersistence to ~5s, but the queue slice also gets rewrites
//     from track advances; 3s catches both without piling up.
//   stats: 1s — an incrementPlay dispatch happens once per track change.
const statsPersistConfig = {
  key: 'stats',
  storage,
  version: 3,
  migrate: resetMigrate,
  throttle: 1000,
};
const libraryPersistConfig = {
  key: 'library',
  storage,
  version: 2,
  migrate: resetMigrate,
  throttle: 1000,
};
// Kept separate from libraryPersistConfig: starred toggles on every heart tap and
// must not re-serialize/re-write the full albums/artists/tracks catalog each time.
const libraryStarredPersistConfig = {
  key: 'libraryStarred',
  storage,
  throttle: 1000,
};

export const rootReducer = combineReducers({
    servers: serversReducer,
    downloaders: downloadersReducer,
    audiomuse: audiomuseReducer,
    settings: settingsReducer,
    listenbrainz: listenbrainzReducer,
    playback: playbackReducer,
    stats: statsReducer,
    library: libraryReducer,
    libraryStarred: libraryStarredReducer,
    offlineMutations: offlineMutationsReducer,
    searchHistory: searchHistoryReducer,
});

const persistedReducer = combineReducers({
    servers: persistReducer(serversPersistConfig, serversReducer),
    downloaders: persistReducer(downloadersPersistConfig, downloadersReducer),
    audiomuse: persistReducer(audiomusePersistConfig, audiomuseReducer),
    settings: persistReducer(settingsPersistConfig, settingsReducer),
    listenbrainz: persistReducer(listenbrainzPersistConfig, listenbrainzReducer),
    playback: persistReducer(playbackPersistConfig, playbackReducer),
    stats: persistReducer(statsPersistConfig, statsReducer),
    library: persistReducer(libraryPersistConfig, libraryReducer),
    libraryStarred: persistReducer(libraryStarredPersistConfig, libraryStarredReducer),
    offlineMutations: persistReducer(offlineMutationsPersistConfig, offlineMutationsReducer),
    searchHistory: persistReducer(searchHistoryPersistConfig, searchHistoryReducer),
});

const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            immutableCheck: false,
            serializableCheck: false,
        }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
