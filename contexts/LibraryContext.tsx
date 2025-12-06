import React, { createContext, useContext, ReactNode, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useServer } from '@/contexts/ServerContext';
import { RootState } from '@/utils/redux/store';
import { useStore } from 'react-redux';
import {
    resetLibraryState,
} from '@/utils/redux/slices/librarySlice';
import { resetGenreMaps } from '@/utils/redux/slices/genreSlice';
import { resetStatsMap } from '@/utils/redux/slices/statsSlice';
import { fetchStarredService } from '@/utils/library/starredService';
import {
    starItem,
    unstarItem,
} from "@/utils/navidrome/starApi";
import {
    favoriteItemJellyfin,
    unfavoriteItemJellyfin,
} from "@/utils/jellyfin/starApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { runLibraryServices } from '@/utils/library/runLibraryServices';
import { fetchAlbumsService } from '@/utils/library/albumsService';
import { fetchGenresService } from '@/utils/library/genresService';
import { fetchStatsService } from '@/utils/library/statsService';
import { fetchArtistsService } from '@/utils/library/artistsService';
import { AlbumData, SongData, ArtistData } from '@/types';

interface LibraryContextType {
    albums: AlbumData[];
    artists: ArtistData[];
    starred: { albums: AlbumData[]; artists: ArtistData[]; songs: SongData[] };
    songs: SongData[];
    fetchLibrary: (force?: boolean) => Promise<void>;
    refreshLibrary: () => void;
    clearLibrary: () => void;
    starItem: (id: string) => Promise<void>;
    unstarItem: (id: string) => Promise<void>;
    libraryServiceStats: Record<string, any>;
    isLoading: boolean;
}

interface LibraryProviderProps {
    children: ReactNode;
}

const LibraryContext = createContext<LibraryContextType | undefined>(undefined);

export const useLibrary = () => {
    const context = useContext(LibraryContext);
    if (!context) {
        throw new Error('useLibrary must be used within a LibraryProvider');
    }
    return context;
};

export const LibraryProvider: React.FC<LibraryProviderProps> = ({ children }) => {
    const { serverType, serverUrl, username, password } = useServer();
    const dispatch = useDispatch();
    const reduxStore = useStore();
    const { albums, artists, starred } = useSelector((state: RootState) => state.library);
    const { services: libraryServiceStats } = useSelector((state: RootState) => state.libraryStatus);
    const isLibraryFetchedRef = useRef(false);
    const [isLoading, setIsLoading] = useState(false);

    const context = {
        serverType,
        serverUrl,
        username,
        password,
        dispatch,
        getState: () => reduxStore.getState() as RootState,
    };

    const fetchLibrary = async (force = false) => {
        if (!serverType || !serverUrl || !username || !password || (isLibraryFetchedRef.current && !force))
            return;

        setIsLoading(true);
        isLibraryFetchedRef.current = true;

        try {
            await runLibraryServices([fetchAlbumsService], context);

            await runLibraryServices(
                [fetchGenresService, fetchArtistsService, fetchStarredService],
                context
            );

            runLibraryServices([fetchStatsService], context);
        } finally {
            setIsLoading(false);
        }
    };

    const refreshLibrary = () => {
        dispatch(resetLibraryState());
        dispatch(resetGenreMaps());
        dispatch(resetStatsMap());
        isLibraryFetchedRef.current = false;
        fetchLibrary();
    };

    const allSongs: SongData[] = albums.flatMap(album => album.songs || []);

    const handleStarItem = async (id: string) => {
        if (!serverType || !serverUrl || !username || !password) return;

        if (serverType === "jellyfin") {
            const token = await AsyncStorage.getItem("jellyfin_token");
            const userId = await AsyncStorage.getItem("jellyfin_userId");
            if (!token || !userId) {
                console.warn("[Library] Missing Jellyfin credentials for starItem");
                return;
            }
            await favoriteItemJellyfin(serverUrl, userId, token, id);
        } else {
            await starItem(serverUrl, username, password, id);
        }

        await runLibraryServices([fetchStarredService], context);
    };

    const handleUnstarItem = async (id: string) => {
        if (!serverType || !serverUrl || !username || !password) return;

        if (serverType === "jellyfin") {
            const token = await AsyncStorage.getItem("jellyfin_token");
            const userId = await AsyncStorage.getItem("jellyfin_userId");
            if (!token || !userId) {
                console.warn("[Library] Missing Jellyfin credentials for unstarItem");
                return;
            }
            await unfavoriteItemJellyfin(serverUrl, userId, token, id);
        } else {
            await unstarItem(serverUrl, username, password, id);
        }

        await runLibraryServices([fetchStarredService], context);
    };

    const clearLibrary = () => {
        dispatch(resetLibraryState());
        dispatch(resetGenreMaps());
        dispatch(resetStatsMap());
        isLibraryFetchedRef.current = false;
    };

    return (
        <LibraryContext.Provider
            value={{
                albums,
                artists,
                starred,
                songs: allSongs,
                fetchLibrary,
                refreshLibrary,
                clearLibrary,
                starItem: handleStarItem,
                unstarItem: handleUnstarItem,
                libraryServiceStats,
                isLoading
            }}
        >
            {children}
        </LibraryContext.Provider>
    );
};