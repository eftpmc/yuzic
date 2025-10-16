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

  // Load token from storage on mount
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem('jellyfin_token');
      if (saved) {
        setToken(saved);
        dispatch(setAuthenticated(true));
      }
    })();
  }, []);

  // Deauth when token disappears
  useEffect(() => {
    if (!token) {
      console.log('[Jellyfin] Token missing — deauthenticating');
      dispatch(setAuthenticated(false));
    }
  }, [token]);

  // Verify connection if token and URL exist
  useEffect(() => {
    if (!serverUrl || !token) return;
    (async () => {
      try {
        const res = await fetch(`${serverUrl}/System/Ping`, {
          headers: { 'X-Emby-Token': token },
        });
        if (res.ok) dispatch(setAuthenticated(true));
      } catch {
        /* silent */
      }
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
      const err = await response.json().catch(() => null);
      return { success: false, message: err?.ErrorMessage || 'Login failed' };
    }

    const data = await response.json();
    const accessToken = data?.AccessToken;
    if (!accessToken) return { success: false, message: 'No access token returned' };

    // ✅ Save token
    await AsyncStorage.setItem('jellyfin_token', accessToken);
    setToken(accessToken);
    dispatch(setAuthenticated(true));

    // ✅ Save first music library if available
    const res = await fetch(`${serverUrl}/Library/MediaFolders`, {
      headers: { 'X-Emby-Token': accessToken },
    });
    const libs = await res.json();
    const musicLibs = (libs.Items || []).filter(
      (lib: any) => lib.CollectionType?.toLowerCase() === 'music'
    );

    if (musicLibs.length > 0) {
      const chosen = musicLibs[0];
      console.log('[Jellyfin] Auto-selected music library:', chosen.Name);
      await AsyncStorage.setItem('jellyfin_library_id', chosen.Id);
    } else {
      console.warn('[Jellyfin] No music libraries found.');
    }

    return { success: true };
  } catch (err) {
    console.error('Jellyfin login error:', err);
    return { success: false, message: 'Connection failed' };
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
    if (!serverUrl || !token) {
      console.warn('[Jellyfin] Missing credentials when calling getLibraries()');
      return [];
    }
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
    } catch (err) {
      console.error('[Jellyfin] Failed to fetch libraries', err);
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

  console.log('[Token]', token);
  console.log('[Server]', serverUrl);

  return (
    <JellyfinContext.Provider
      value={{
        serverUrl,
        username,
        password,
        isAuthenticated,
        setServerUrl: (url) => dispatch(setServerUrl(url)),
        setUsername: (user) => dispatch(setUsername(user)),
        setPassword: (pass) => dispatch(setPassword(pass)),
        connectToServer,
        pingServer,
        testServerUrl,
        startScan,
        getLibraries, // ✅ with credentials
        disconnect: disconnectServer,
      }}
    >
      {children}
    </JellyfinContext.Provider>
  );
};