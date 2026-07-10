import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import { reduxStorage as storage } from '@/utils/mmkvStorage';

import serversReducer from './slices/serversSlice';
import downloadersReducer from './slices/downloadersSlice';
import settingsReducer from './slices/settingsSlice';
import listenbrainzReducer from './slices/listenbrainzSlice';
import lastfmReducer from './slices/lastfmSlice';
import statsReducer from './slices/statsSlice';
import libraryReducer from './slices/librarySlice';
import offlineMutationsReducer from './slices/offlineMutationsSlice';

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
  return Promise.resolve({ ...state, syncOnAppStart: true, searchScope: migratedScope });
};

const serversPersistConfig = { key: 'servers', storage };
const downloadersPersistConfig = { key: 'downloaders', storage };
const settingsPersistConfig = {
  key: 'settings',
  storage,
  version: 2,
  migrate: settingsMigrate,
};
const listenbrainzPersistConfig = { key: 'listenbrainz', storage };
const lastfmPersistConfig = { key: 'lastfm', storage };
const offlineMutationsPersistConfig = { key: 'offlineMutations', storage };

const statsPersistConfig = {
  key: 'stats',
  storage,
  version: 3,
  migrate: resetMigrate,
};
const libraryPersistConfig = {
  key: 'library',
  storage,
  version: 2,
  migrate: resetMigrate,
};

export const rootReducer = combineReducers({
    servers: serversReducer,
    downloaders: downloadersReducer,
    settings: settingsReducer,
    listenbrainz: listenbrainzReducer,
    lastfm: lastfmReducer,
    stats: statsReducer,
    library: libraryReducer,
    offlineMutations: offlineMutationsReducer,
});

const persistedReducer = combineReducers({
    servers: persistReducer(serversPersistConfig, serversReducer),
    downloaders: persistReducer(downloadersPersistConfig, downloadersReducer),
    settings: persistReducer(settingsPersistConfig, settingsReducer),
    listenbrainz: persistReducer(listenbrainzPersistConfig, listenbrainzReducer),
    lastfm: persistReducer(lastfmPersistConfig, lastfmReducer),
    stats: persistReducer(statsPersistConfig, statsReducer),
    library: persistReducer(libraryPersistConfig, libraryReducer),
    offlineMutations: persistReducer(offlineMutationsPersistConfig, offlineMutationsReducer),
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
