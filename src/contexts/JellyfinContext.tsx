import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootState } from '@/utils/redux/store';
import {
  setServerUrl,
  setUsername,
  setPassword,
  setAuthenticated,
  disconnect,
} from '@/utils/redux/slices/serverSlice';

interface JellyfinContextType {
  serverUrl: string;
  username: string;
  password: string;
  isAuthenticated: boolean;
  isLoading: boolean;
  setServerUrl: (url: string) => void;
  setUsername: (user: string) => void;
  setPassword: (pass: string) => void;
  connectToServer: () => Promise<{ success: boolean; message?: string }>;
  pingServer: () => Promise<boolean>;
  testServerUrl: (url: string) => Promise<{ success: boolean; message?: string }>;
  startScan: () => Promise<{ success: boolean; message?: string }>;
  getLibraries?: () => Promise<{ id: string; name: string; type: string }[]>;
  disconnect: () => void;
}

const JellyfinContext = createContext<JellyfinContextType | undefined>(undefined);

export const useJellyfin = () => {
  const context = useContext(JellyfinContext);
  if (!context) throw new Error('useJellyfin must be used within a JellyfinProvider');
  return context;
};

export const JellyfinProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const { serverUrl, username, password, isAuthenticated } = useSelector(
    (state: RootState) => state.server
  );

  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('jellyfin_token');
      if (saved) {
        setToken(saved);
        dispatch(setAuthenticated(true));
      }
      setIsLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!token && !isLoading) dispatch(setAuthenticated(false));
  }, [token, isLoading]);

  useEffect(() => {
    if (!serverUrl || !token) return;
    (async () => {
      try {
        const res = await fetch(`${serverUrl}/System/Ping`, {
          headers: { 'X-Emby-Token': token },
        });
        if (res.ok) dispatch(setAuthenticated(true));
      } catch {}
    })();
  }, [serverUrl, token]);

  const connectToServer = async (
    providedUsername?: string,
    providedPassword?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const user = providedUsername ?? username;
    const pass = providedPassword ?? password;

    if (!serverUrl || !user || !pass) {
      return { success: false, message: 'Missing credentials or server URL' };
    }

    try {
      const response = await fetch(`${serverUrl}/Users/AuthenticateByName`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Authorization':
            `MediaBrowser Client="Yuzic", Device="Mobile", DeviceId="yuzic-device", Version="1.0.0"`,
        },
        body: JSON.stringify({ Username: user, Pw: pass }),
      });

      if (!response.ok) {
        let msg = `Login failed (${response.status})`;
        if (response.status === 401) msg = 'Invalid username or password.';
        if (response.status === 403)
          msg = 'User not permitted to sign in. Enable "Allow remote connections" in Jellyfin user settings.';
        return { success: false, message: msg };
      }

      const data = await response.json().catch(() => ({}));
      const accessToken = data?.AccessToken;
      const userId = data?.User?.Id;
      if (!accessToken || !userId) {
        return { success: false, message: 'Invalid login response from Jellyfin.' };
      }

      await AsyncStorage.multiSet([
        ['jellyfin_token', accessToken],
        ['jellyfin_userId', userId],
      ]);

      setToken(accessToken);
      dispatch(setAuthenticated(true));

      try {
        const libsRes = await fetch(`${serverUrl}/Library/MediaFolders`, {
          headers: { 'X-Emby-Token': accessToken },
        });
        if (libsRes.ok) {
          const libs = await libsRes.json();
          const musicLibs = (libs.Items || []).filter(
            (lib: any) => lib.CollectionType?.toLowerCase() === 'music'
          );
          if (musicLibs.length) {
            const chosen = musicLibs[0];
            await AsyncStorage.setItem('jellyfin_library_id', chosen.Id);
          }
        }
      } catch {}

      return { success: true };
    } catch {
      return { success: false, message: 'Connection failed. Check your server URL or network.' };
    }
  };

  const pingServer = async () => {
    if (!serverUrl) return false;
    try {
      const res = await fetch(`${serverUrl}/System/Ping`, {
        headers: token ? { 'X-Emby-Token': token } : undefined,
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  const testServerUrl = async (url: string) => {
    try {
      const res = await fetch(`${url}/System/Info/Public`);
      if (!res.ok) throw new Error();
      return { success: true };
    } catch {
      return { success: false, message: 'Could not reach Jellyfin server' };
    }
  };

  const getLibraries = async (): Promise<{ id: string; name: string; type: string }[]> => {
    if (!serverUrl || !token) return [];
    try {
      const res = await fetch(`${serverUrl}/Library/MediaFolders`, {
        headers: { 'X-Emby-Token': token },
      });
      const data = await res.json();
      return (data.Items || []).map((lib: any) => ({
        id: lib.Id,
        name: lib.Name,
        type: lib.CollectionType,
      }));
    } catch {
      return [];
    }
  };

  const startScan = async () => {
    if (!serverUrl || !token)
      return { success: false, message: 'Not authenticated' };
    try {
      const res = await fetch(`${serverUrl}/Library/Refresh`, {
        method: 'POST',
        headers: { 'X-Emby-Token': token },
      });
      return res.ok
        ? { success: true }
        : { success: false, message: 'Failed to start library scan' };
    } catch {
      return { success: false, message: 'Scan failed' };
    }
  };

  const disconnectServer = async () => {
    await AsyncStorage.removeItem('jellyfin_token');
    setToken(null);
    dispatch(disconnect());
  };

  return (
    <JellyfinContext.Provider
      value={{
        serverUrl,
        username,
        password,
        isAuthenticated,
        isLoading,
        setServerUrl: (url) => dispatch(setServerUrl(url)),
        setUsername: (user) => dispatch(setUsername(user)),
        setPassword: (pass) => dispatch(setPassword(pass)),
        connectToServer,
        pingServer,
        testServerUrl,
        startScan,
        getLibraries,
        disconnect: disconnectServer,
      }}
    >
      {children}
    </JellyfinContext.Provider>
  );
};