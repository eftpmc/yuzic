import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/utils/redux/store';
import { useNavidrome } from './NavidromeContext';
import { useJellyfin } from './JellyfinContext';
import { ServerContextType } from '@/types';
import { setServerType, setServerUrl, setUsername, setPassword } from '@/utils/redux/slices/serverSlice';
import { createContext, ReactNode, useContext } from 'react';

const ServerContext = createContext<ServerContextType | undefined>(undefined);

export const useServer = () => {
  const context = useContext(ServerContext);
  if (!context) throw new Error('useServer must be used within a ServerProvider');
  return context;
};

export const ServerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const serverType = useSelector((state: RootState) => state.server.type);
  const dispatch = useDispatch();
  const navidrome = useNavidrome();
  const jellyfin = useJellyfin();

  let contextValue: ServerContextType;

  if (serverType === 'navidrome') {
    contextValue = { serverType, ...navidrome };
  } else if (serverType === 'jellyfin') {
    contextValue = { serverType, ...jellyfin };
  } else {
    // fallback: allow setting base values, but disable all actions
    contextValue = {
      serverType: 'navidrome', // placeholder; not yet set
      serverUrl: '',
      username: '',
      password: '',
      isAuthenticated: false,
      setServerUrl: (url) => dispatch(setServerUrl(url)),
      setUsername: (user) => dispatch(setUsername(user)),
      setPassword: (pass) => dispatch(setPassword(pass)),
      connectToServer: async () => ({ success: false, message: 'No server type set' }),
      pingServer: async () => false,
      testServerUrl: async () => ({ success: false, message: 'No server type set' }),
      startScan: async () => ({ success: false, message: 'No server type set' }),
      disconnect: () => {},
    };
  }

  return <ServerContext.Provider value={contextValue}>{children}</ServerContext.Provider>;
};