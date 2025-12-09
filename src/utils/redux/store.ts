import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from '@react-native-async-storage/async-storage';
import { FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import serverReducer from './slices/serverSlice';
import libraryReducer from './slices/librarySlice';
import genreReducer from './slices/genreSlice';
import statsReducer from './slices/statsSlice';
import libraryStatusReducer from './slices/libraryStatusSlice';
import lidarrReducer from './slices/lidarrSlice'
import userStatsReducer from './slices/userStatsSlice';

const serverPersistConfig = {
    key: 'server',
    storage,
};

const lidarrPersistConfig = {
    key: 'lidarr',
    storage,
};

const libraryPersistConfig = {
    key: 'library',
    storage,
};

const genrePersistConfig = {
    key: 'genre',
    storage,
};

const statsPersistConfig = {
    key: 'stats',
    storage,
};

const userStatsPersistConfig = {
    key: 'userStats',
    storage,
};

const persistedServerReducer = persistReducer(serverPersistConfig, serverReducer);
const persistedLidarrReducer = persistReducer(lidarrPersistConfig, lidarrReducer);
const persistedLibraryReducer = persistReducer(libraryPersistConfig, libraryReducer);
const persistedGenreReducer = persistReducer(genrePersistConfig, genreReducer);
const persistedStatsReducer = persistReducer(statsPersistConfig, statsReducer);
const persistedUserStatsReducer = persistReducer(userStatsPersistConfig, userStatsReducer)

// Configure the store
const store = configureStore({
    reducer: {
        server: persistedServerReducer,
        lidarr: persistedLidarrReducer,
        library: persistedLibraryReducer,
        genre: persistedGenreReducer,
        stats: persistedStatsReducer,
        userStats: persistedUserStatsReducer,
        libraryStatus: libraryStatusReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            immutableCheck: false,
            serializableCheck: false,
        }),
});

// Persistor to manage the store's persistence
export const persistor = persistStore(store);

// Define RootState and AppDispatch types for TypeScript
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;