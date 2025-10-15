import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {useDispatch, useSelector, useStore} from 'react-redux';
import { useServer } from '@/contexts/ServerContext';
import {
    addSongToPlaylistNav,
    removeSongFromPlaylistNav,
    createPlaylistNav,
} from '@/utils/navidrome/playlistApi';
import { fetchPlaylistsService } from '@/utils/library/playlistService';
import { runLibraryServices } from '@/utils/library/runLibraryServices';
import { RootState } from '@/utils/redux/store';
import { PlaylistData, SongData } from "@/types";
import { useLibrary } from './LibraryContext';

interface PlaylistContextType {
    playlists: PlaylistData[];
    addSongToPlaylist: (playlistId: string, song: SongData) => Promise<void>;
    createPlaylist: (name: string) => Promise<void>;
    removeSongFromPlaylist: (playlistId: string, songIndex: string) => Promise<void>;
    fetchAllPlaylists: () => Promise<void>;
}

interface PlaylistProviderProps {
    children: ReactNode;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export const usePlaylists = () => {
    const context = useContext(PlaylistContext);
    if (!context) {
        throw new Error('usePlaylists must be used within a PlaylistProvider');
    }
    return context;
};

export const PlaylistProvider: React.FC<PlaylistProviderProps> = ({ children }) => {
    const { serverUrl, username, password } = useServer();
    const dispatch = useDispatch();
    const store = useStore();
    const { playlists } = useSelector((state: RootState) => state.library);
    const { starred } = useLibrary();

    const fetchAllPlaylists = async () => {
        if (!serverUrl || !username || !password) return;

        await runLibraryServices([fetchPlaylistsService], {
            serverUrl,
            username,
            password,
            dispatch,
            getState: () => store.getState() as RootState,
        });
    };

    const addSongToPlaylist = async (playlistId: string, song: SongData) => {
        await addSongToPlaylistNav(serverUrl, username, password, playlistId, song.id);
        await fetchAllPlaylists();
    };

    const createPlaylist = async (name: string) => {
        await createPlaylistNav(serverUrl, username, password, name);
        await fetchAllPlaylists();
    };

    const removeSongFromPlaylist = async (playlistId: string, songIndex: string) => {
        await removeSongFromPlaylistNav(serverUrl, username, password, playlistId, songIndex);
        await fetchAllPlaylists();
    };

    useEffect(() => {
        fetchAllPlaylists();
    }, [starred.songs.length]);

    return (
        <PlaylistContext.Provider
            value={{
                playlists,
                addSongToPlaylist,
                createPlaylist,
                removeSongFromPlaylist,
                fetchAllPlaylists,
            }}
        >
            {children}
        </PlaylistContext.Provider>
    );
};