import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from '@react-native-async-storage/async-storage';

import serversReducer from './slices/serversSlice';
import libraryReducer from './slices/librarySlice';
import lidarrReducer from './slices/lidarrSlice';
import settingsReducer from './slices/settingsSlice';
import downloadsReducer from './slices/downloadsSlice';
import lastfmReducer from './slices/lastfmSlice'

const serversPersistConfig = { key: 'servers', storage };
const lidarrPersistConfig = { key: 'lidarr', storage };
const libraryPersistConfig = { key: 'library', storage };
const settingsPersistConfig = { key: 'settings', storage };
const downloadsPersistConfig = { key: 'downloads', storage };
const lastfmPersistConfig = {key: 'lastfm', storage };

export const rootReducer = combineReducers({
    servers: serversReducer,
    lidarr: lidarrReducer,
    library: libraryReducer,
    settings: settingsReducer,
    downloads: downloadsReducer,
    lastfm: lastfmReducer
});

const persistedReducer = combineReducers({
    servers: persistReducer(serversPersistConfig, serversReducer),
    lidarr: persistReducer(lidarrPersistConfig, lidarrReducer),
    library: persistReducer(libraryPersistConfig, libraryReducer),
    settings: persistReducer(settingsPersistConfig, settingsReducer),
    downloads: persistReducer(downloadsPersistConfig, downloadsReducer),
    lastfm: persistReducer(lastfmPersistConfig, lastfmReducer)
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