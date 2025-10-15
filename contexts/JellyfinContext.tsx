import React, { createContext, useContext, ReactNode } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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
  disconnect: () => void;
}

interface JellyfinProviderProps {
  children: ReactNode;
}

const JellyfinContext = createContext<JellyfinContextType | undefined>(undefined);

export const useJellyfin = () => {
  const context = useContext(JellyfinContext);
  if (!context) throw new Error('useJellyfin must be used within a JellyfinProvider');
  return context;
};

export const JellyfinProvider: React.FC<JellyfinProviderProps> = ({ children }) => {
  const dispatch = useDispatch();
  const { serverUrl, username, password, isAuthenticated } = useSelector(
    (state: RootState) => state.server
  );

  // Empty no-op function implementations for now
  const connectToServer = async () => {
    try {
      const response = await fetch(`${serverUrl}/Users/AuthenticateByName`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Emby-Authorization': `MediaBrowser Client="YourAppName", Device="DeviceName", DeviceId="some-id", Version="1.0.0"`,
        },
        body: JSON.stringify({
          Username: username,
          Pw: password,
        }),
      });
  
      if (!response.ok) {
        const error = await response.json();
        return { success: false, message: error?.ErrorMessage || 'Login failed' };
      }
  
      const data = await response.json();
      const { AccessToken } = data;
  
      if (AccessToken) {
        dispatch(setAuthenticated(true));
        // Optionally store token in secure storage if needed
        return { success: true };
      } else {
        return { success: false, message: 'No access token returned' };
      }
    } catch (error) {
      return { success: false, message: 'Connection failed' };
    }
  };  

  const pingServer = async () => {
    try {
      const res = await fetch(`${serverUrl}/System/Ping`);
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

  const startScan = async () => {
    try {
      const res = await fetch(`${serverUrl}/Library/Refresh`, {
        method: 'POST',
        headers: {
          'X-Emby-Token': '<token>', // If you store token after auth
        },
      });
  
      return res.ok
        ? { success: true }
        : { success: false, message: 'Failed to start library scan' };
    } catch {
      return { success: false, message: 'Scan failed' };
    }
  };  

  const disconnectServer = () => dispatch(disconnect());

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
        disconnect: disconnectServer,
      }}
    >
      {children}
    </JellyfinContext.Provider>
  );
};