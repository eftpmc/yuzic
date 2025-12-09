import React, { createContext, ReactNode, useContext } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '@/utils/redux/store';
import { useNavidrome } from './NavidromeContext';
import { useJellyfin } from './JellyfinContext';
import { ServerContextType } from '@/types';

/**
 * Shared ServerContext accessible throughout the app
 */
const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const useServer = () => {
  const context = useContext(ServerContext);
  if (!context) throw new Error('useServer must be used within a ServerProvider');
  return context;
};

/**
 * ServerProvider — provides a unified server context
 * that switches seamlessly between Navidrome and Jellyfin
 * without unmounting or causing UI flicker.
 */
export const ServerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const serverType = useSelector((state: RootState) => state.server.type);

  // Keep both contexts mounted at all times
  const navidrome = useNavidrome();
  const jellyfin = useJellyfin();

  // Helpful combined loading for the "none" state so routing can wait for hydration
  const anyLoading =
    Boolean((navidrome as any)?.isLoading) || Boolean((jellyfin as any)?.isLoading);

  // Choose which context to expose based on Redux type
  const value: ServerContextType =
  serverType === 'jellyfin'
    ? {
        serverType: 'jellyfin',
        ...jellyfin,
        isLoading: (jellyfin as any)?.isLoading ?? false, // ✅ defined after spread
      }
    : serverType === 'navidrome'
    ? {
        serverType: 'navidrome',
        ...navidrome,
        isLoading: (navidrome as any)?.isLoading ?? false, // ✅ defined after spread
      }
    : {
        serverType: 'none',
        isAuthenticated: false,
        isLoading:
          Boolean((navidrome as any)?.isLoading) ||
          Boolean((jellyfin as any)?.isLoading),
        serverUrl: '',
        username: '',
        password: '',
        setServerUrl: () => {},
        setUsername: () => {},
        setPassword: () => {},
        connectToServer: async () => ({ success: false, message: 'Not connected' }),
        pingServer: async () => false,
        testServerUrl: async () => ({ success: false, message: 'Not connected' }),
        startScan: async () => ({ success: false, message: 'Not connected' }),
        getLibraries: async () => [],
        disconnect: () => {},
      };

  return <ServerContext.Provider value={value}>{children}</ServerContext.Provider>;
};

export { ServerContext };