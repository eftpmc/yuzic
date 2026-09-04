import { Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';

import { useSync } from '@/hooks/useSync';
import { useIsOffline } from '@/hooks/useIsOffline';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import { clearLibrary } from '@/utils/redux/slices/librarySlice';
import { clearLibraryStarred } from '@/utils/redux/slices/libraryStarredSlice';
import { ExternalResolutionProvider } from '@/features/sources/ExternalResolutionProvider';
import { ServerReachabilityWatcher } from '@/features/connectivity/ServerReachabilityWatcher';
import { AutoDownloadWatcher } from '@/features/downloads/AutoDownloadWatcher';
import { DownloadersQueueProvider } from '@/features/downloaders/DownloadersQueueContext';
import { AccountSheetProvider } from '@/contexts/AccountSheetContext';

/**
 * The outer authenticated layout: providers, watchers, and the app-wide sync
 * effects. Every route the app can reach after login lives inside `(tabs)`,
 * which owns its own Tabs + per-tab Stack. Detail routes (album, artist,
 * playlist, settings, radio, podcasts, shares, downloads, genres, library
 * collections) live in the shared `(tabs)/(home,search,library)/` group so
 * they push onto the currently-focused tab's stack — the tab bar and
 * PlayingBar stay docked below across the whole browse session.
 */
export default function HomeLayout() {
  const { sync } = useSync();
  const dispatch = useDispatch();
  const isOffline = useIsOffline();
  const isOfflineRef = useRef(isOffline);
  const appState = useRef(AppState.currentState);
  const activeServerId = useSelector(selectActiveServerId);
  const prevServerIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    isOfflineRef.current = isOffline;
  }, [isOffline]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        if (!isOfflineRef.current) sync();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [sync]);

  // Clear stale library data and re-sync when switching between two real servers.
  // Both values must be non-null to avoid triggering during persist rehydration
  // (null → real-id on cold start would otherwise be treated as a server switch).
  useEffect(() => {
    const prev = prevServerIdRef.current;
    prevServerIdRef.current = activeServerId;
    if (prev && activeServerId && prev !== activeServerId) {
      clearLibrary(dispatch);
      dispatch(clearLibraryStarred());
      if (!isOfflineRef.current) sync();
    }
  }, [activeServerId, dispatch, sync]);

  return (
    <ExternalResolutionProvider>
      <AccountSheetProvider>
        <DownloadersQueueProvider>
          <ServerReachabilityWatcher />
          <AutoDownloadWatcher />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
          </Stack>
        </DownloadersQueueProvider>
      </AccountSheetProvider>
    </ExternalResolutionProvider>
  );
}
