import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer, createMigrate } from 'redux-persist';
import { reduxStorage as storage } from '@/utils/mmkvStorage';

import serversReducer from './slices/serversSlice';
import downloadersReducer from './slices/downloadersSlice';
import settingsReducer from './slices/settingsSlice';
import listenbrainzReducer from './slices/listenbrainzSlice';
import statsReducer from './slices/statsSlice';
import libraryReducer from './slices/librarySlice';
import offlineMutationsReducer from './slices/offlineMutationsSlice';

// ─── Migrations ───────────────────────────────────────────────────────────────
// Version 1: normalize state shapes that changed during the redesign.
// library  — always safe to reset; it re-syncs from the server on launch.
// stats    — all fields must be plain objects (Records), sanitize if needed.

const libraryMigrations: Record<number, (s: any) => any> = {
  1: () => ({ albums: [], artists: [], playlists: [], tracks: [], genres: [], starred: [] }),
};

const statsMigrations: Record<number, (s: any) => any> = {
  1: (state: any) => ({
    songPlays: state?.songPlays && typeof state.songPlays === 'object' ? state.songPlays : {},
    albumPlays: state?.albumPlays && typeof state.albumPlays === 'object' ? state.albumPlays : {},
    artistPlays: state?.artistPlays && typeof state.artistPlays === 'object' ? state.artistPlays : {},
    playlistPlays: state?.playlistPlays && typeof state.playlistPlays === 'object' ? state.playlistPlays : {},
    songLastPlayedAt: state?.songLastPlayedAt && typeof state.songLastPlayedAt === 'object' ? state.songLastPlayedAt : {},
    albumLastPlayedAt: state?.albumLastPlayedAt && typeof state.albumLastPlayedAt === 'object' ? state.albumLastPlayedAt : {},
    artistLastPlayedAt: state?.artistLastPlayedAt && typeof state.artistLastPlayedAt === 'object' ? state.artistLastPlayedAt : {},
    playlistLastPlayedAt: state?.playlistLastPlayedAt && typeof state.playlistLastPlayedAt === 'object' ? state.playlistLastPlayedAt : {},
  }),
};
// ──────────────────────────────────────────────────────────────────────────────

const serversPersistConfig = { key: 'servers', storage };
const downloadersPersistConfig = { key: 'downloaders', storage };
const settingsPersistConfig = { key: 'settings', storage };
const listenbrainzPersistConfig = { key: 'listenbrainz', storage };
const offlineMutationsPersistConfig = { key: 'offlineMutations', storage };

const statsPersistConfig = {
  key: 'stats',
  storage,
  version: 1,
  migrate: createMigrate(statsMigrations, { debug: false }),
};
const libraryPersistConfig = {
  key: 'library',
  storage,
  version: 1,
  migrate: createMigrate(libraryMigrations, { debug: false }),
};

export const rootReducer = combineReducers({
    servers: serversReducer,
    downloaders: downloadersReducer,
    settings: settingsReducer,
    listenbrainz: listenbrainzReducer,
    stats: statsReducer,
    library: libraryReducer,
    offlineMutations: offlineMutationsReducer,
});

const persistedReducer = combineReducers({
    servers: persistReducer(serversPersistConfig, serversReducer),
    downloaders: persistReducer(downloadersPersistConfig, downloadersReducer),
    settings: persistReducer(settingsPersistConfig, settingsReducer),
    listenbrainz: persistReducer(listenbrainzPersistConfig, listenbrainzReducer),
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
