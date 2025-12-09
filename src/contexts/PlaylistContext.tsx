import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useServer } from '@/contexts/ServerContext';
import {
  addSongToPlaylistNav,
  removeSongFromPlaylistNav,
  createPlaylistNav,
} from '@/utils/navidrome/playlistApi';
import {
  addItemsToPlaylistJellyfin,
  removeItemsFromPlaylistJellyfin,
  createPlaylistJellyfin,
} from '@/utils/jellyfin/playlistApi';
import { fetchPlaylistsService } from '@/utils/library/playlistService';
import { runLibraryServices } from '@/utils/library/runLibraryServices';
import { RootState } from '@/utils/redux/store';
import { PlaylistData, SongData } from '@/types';
import { useLibrary } from './LibraryContext';

interface PlaylistContextType {
  playlists: PlaylistData[];
  addSongToPlaylist: (playlistId: string, song: SongData) => Promise<void>;
  createPlaylist: (name: string) => Promise<void>;
  removeSongFromPlaylist: (playlistId: string, songIndex: string) => Promise<void>;
  fetchAllPlaylists: () => Promise<void>;
}

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

export const usePlaylists = () => {
  const context = useContext(PlaylistContext);
  if (!context) throw new Error('usePlaylists must be used within a PlaylistProvider');
  return context;
};

export const PlaylistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { serverType, serverUrl, username, password } = useServer();
  const dispatch = useDispatch();
  const store = useStore();
  const { playlists } = useSelector((state: RootState) => state.library);
  const { starred } = useLibrary();

  const fetchAllPlaylists = async () => {
    if (!serverUrl || !username || !password) return;

    // prevent fetching if user logged out
    const token = await AsyncStorage.getItem('jellyfin_token');
    const userId = await AsyncStorage.getItem('jellyfin_userId');
    if (serverType === 'jellyfin' && (!token || !userId)) {
      console.log('[Playlist] Skipping Jellyfin playlist fetch — not authenticated');
      return;
    }

    await runLibraryServices([fetchPlaylistsService], {
      serverType,
      serverUrl,
      username,
      password,
      dispatch,
      getState: () => store.getState() as RootState,
    });
  };


  const addSongToPlaylist = async (playlistId: string, song: SongData) => {
    if (serverType === 'jellyfin') {
      const token = await AsyncStorage.getItem('jellyfin_token');
      const userId = await AsyncStorage.getItem('jellyfin_userId');
      if (!token || !userId) {
        console.warn('[Playlist] Missing Jellyfin credentials.');
        return;
      }
      await addItemsToPlaylistJellyfin(serverUrl, playlistId, userId, token, [song.id]);
    } else {
      await addSongToPlaylistNav(serverUrl, username, password, playlistId, song.id);
    }
    await fetchAllPlaylists();
  };

  const createPlaylist = async (name: string) => {
    if (serverType === 'jellyfin') {
      const token = await AsyncStorage.getItem('jellyfin_token');
      const userId = await AsyncStorage.getItem('jellyfin_userId');
      if (!token || !userId) {
        console.warn('[Playlist] Missing Jellyfin credentials.');
        return;
      }
      await createPlaylistJellyfin(serverUrl, userId, token, name);
    } else {
      await createPlaylistNav(serverUrl, username, password, name);
    }
    await fetchAllPlaylists();
  };

  const removeSongFromPlaylist = async (playlistId: string, songIndex: string) => {
    if (serverType === 'jellyfin') {
      const token = await AsyncStorage.getItem('jellyfin_token');
      const userId = await AsyncStorage.getItem('jellyfin_userId');
      if (!token || !userId) {
        console.warn('[Playlist] Missing Jellyfin credentials.');
        return;
      }
      // Jellyfin removeItemsFromPlaylist uses entryIds, not index — adjust if needed
      await removeItemsFromPlaylistJellyfin(serverUrl, playlistId, token, [songIndex]);
    } else {
      await removeSongFromPlaylistNav(serverUrl, username, password, playlistId, songIndex);
    }
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