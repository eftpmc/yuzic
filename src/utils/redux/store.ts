import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from '@react-native-async-storage/async-storage';

import serversReducer from './slices/serversSlice';
import downloadersReducer from './slices/downloadersSlice';
import settingsReducer from './slices/settingsSlice';
import downloadsReducer from './slices/downloadsSlice';
import listenbrainzReducer from './slices/listenbrainzSlice';
import statsReducer from './slices/statsSlice';

const serversPersistConfig = { key: 'servers', storage };
const downloadersPersistConfig = { key: 'downloaders', storage };
const settingsPersistConfig = { key: 'settings', storage };
const downloadsPersistConfig = { key: 'downloads', storage };
const listenbrainzPersistConfig = { key: 'listenbrainz', storage };
const statsPersistConfig = { key: 'stats', storage };

export const rootReducer = combineReducers({
    servers: serversReducer,
    downloaders: downloadersReducer,
    settings: settingsReducer,
    downloads: downloadsReducer,
    listenbrainz: listenbrainzReducer,
    stats: statsReducer,
});

const persistedReducer = combineReducers({
    servers: persistReducer(serversPersistConfig, serversReducer),
    downloaders: persistReducer(downloadersPersistConfig, downloadersReducer),
    settings: persistReducer(settingsPersistConfig, settingsReducer),
    downloads: persistReducer(downloadsPersistConfig, downloadsReducer),
    listenbrainz: persistReducer(listenbrainzPersistConfig, listenbrainzReducer),
    stats: persistReducer(statsPersistConfig, statsReducer),
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