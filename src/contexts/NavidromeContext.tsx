import React, { createContext, useContext, ReactNode, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/utils/redux/store';
import { setServerUrl, setUsername, setPassword, setAuthenticated, disconnect } from '@/utils/redux/slices/serverSlice';

interface NavidromeContextType {
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
    disconnect: () => void;
    startScan: () => Promise<{ success: boolean; message?: string }>;
}

const NavidromeContext = createContext<NavidromeContextType | undefined>(undefined);

export const useNavidrome = () => {
    const context = useContext(NavidromeContext);
    if (!context) throw new Error('useNavidrome must be used within NavidromeProvider');
    return context;
};

export const NavidromeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const dispatch = useDispatch();
    const { serverUrl, username, password, isAuthenticated } = useSelector(
        (state: RootState) => state.server
    );
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const tryAuth = async () => {
            if (!serverUrl || !username || !password) {
                setIsLoading(false);
                return;
            }

            const online = await isOnline();
            if (online) {
                await pingServer();
            } else {
                dispatch(setAuthenticated(true));
            }
            setIsLoading(false);
        };

        tryAuth();
    }, [serverUrl, username, password]);

    const isOnline = async (): Promise<boolean> => {
        try {
            const response = await fetch('https://clients3.google.com/generate_204');
            return response.status === 204;
        } catch {
            return false;
        }
    };

    const pingServer = async (): Promise<boolean> => {
        if (!serverUrl || !username || !password) return false;
        const apiUrl = `${serverUrl}/rest/ping.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(password)}&v=1.16.0&c=NavidromeApp&f=json`;
        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            const success = data['subsonic-response']?.status === 'ok';
            dispatch(setAuthenticated(success));
            return success;
        } catch {
            return false;
        }
    };

    const testServerUrl = async (url: string): Promise<{ success: boolean; message?: string }> => {
        if (!url) return { success: false, message: 'Server URL is required.' };

        try {
            const response = await fetch(url, { method: 'GET' }); // Basic GET request to the URL
            if (response.ok) {
                return { success: true }; // Server is reachable
            } else {
                return { success: false, message: `Server responded with status code ${response.status}.` };
            }
        } catch (error) {
            return { success: false, message: 'Failed to connect to the server. Check the URL.' };
        }
    };

    const startScan = async (): Promise<{ success: boolean; message?: string }> => {
        if (!serverUrl || !username || !password) {
            return { success: false, message: 'Navidrome credentials missing.' };
        }

        const apiUrl = `${serverUrl}/rest/startScan.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(password)}&v=1.16.0&c=NavidromeApp&f=json`;

        try {
            const startResponse = await fetch(apiUrl, { method: 'POST' });
            const startData = await startResponse.json();
            const startSuccess = startData['subsonic-response']?.status === 'ok';
            if (!startSuccess) return { success: false, message: 'Failed to start scan.' };

            const statusUrl = `${serverUrl}/rest/getScanStatus.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(password)}&v=1.16.0&c=NavidromeApp&f=json`;
            const pollScanStatus = async (): Promise<boolean> => {
                try {
                    const statusResponse = await fetch(statusUrl);
                    const statusData = await statusResponse.json();
                    const scanning = statusData['subsonic-response']?.scanStatus?.scanning;
                    return scanning === 'true';
                } catch {
                    return false;
                }
            };

            let isScanning = true;
            const maxRetries = 60;
            let retries = 0;
            while (isScanning && retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, 5000));
                isScanning = await pollScanStatus();
                retries++;
            }
            if (isScanning) return { success: false, message: 'Scan timed out after waiting.' };

            return { success: true, message: 'Scan completed.' };
        } catch {
            return { success: false, message: 'Error contacting Navidrome server.' };
        }
    };

const connectToServer = async (
  providedUsername?: string,
  providedPassword?: string
): Promise<{ success: boolean; message?: string }> => {
  const user = providedUsername ?? username;
  const pass = providedPassword ?? password;
  if (!serverUrl || !user || !pass) {
    return { success: false, message: 'Missing credentials or server URL.' };
  }

  const base = serverUrl.replace(/\/+$/, '');
  const url = `${base}/rest/getMusicFolders.view?u=${encodeURIComponent(user)}&p=${encodeURIComponent(pass)}&v=1.16.0&c=Yuzic&f=json`;

  try {
    const res = await fetch(url);
    if (!res.ok) return { success: false, message: `Server responded with ${res.status}` };

    const data = await res.json().catch(() => ({} as any));
    const status = data['subsonic-response']?.status;
    if (status === 'ok') {
      dispatch(setAuthenticated(true));
      return { success: true };
    }

    const message =
      data['subsonic-response']?.error?.message ||
      'Invalid credentials or unreachable server.';
    return { success: false, message };
  } catch {
    return { success: false, message: 'Failed to reach Navidrome server.' };
  }
};

    const disconnectServer = () => dispatch(disconnect());

    return (
        <NavidromeContext.Provider
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
                disconnect: disconnectServer,
                startScan,
            }}
        >
            {children}
        </NavidromeContext.Provider>
    );
};