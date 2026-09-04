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
 * The outer home layout used to render its own tab bar + PlayingBar overlay
 * on top of the Stack — necessary while the tab bar had to stay pinned to
 * the bottom on every route. That job now lives inside (tabs)/_layout.tsx
 * as a real react-navigation tabBar, and this layout is back to what it
 * should have been: providers, watchers, sync effects, and a Stack.
 *
 * The consequence users will feel: pushing a detail screen from a tab
 * (album, artist, playlist, settings, radio, podcasts, shares, downloads)
 * hides the tab bar + PlayingBar for the duration of that screen, matching
 * standard music-app behavior. If the PlayingBar needs to persist across
 * detail views the tabs contract has to change too — kept as one small
 * step for now.
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
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="albumView" options={{ headerShown: false }} />
            <Stack.Screen name="artistView" options={{ headerShown: false }} />
            <Stack.Screen name="playlistView" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="libraryCollectionView" options={{ headerShown: false }} />
            <Stack.Screen name="genresView" options={{ headerShown: false }} />
            <Stack.Screen name="genreView" options={{ headerShown: false }} />
            <Stack.Screen name="radio" options={{ headerShown: false }} />
            <Stack.Screen name="podcasts" options={{ headerShown: false }} />
            <Stack.Screen name="podcastChannel" options={{ headerShown: false }} />
            <Stack.Screen name="shares" options={{ headerShown: false }} />
            <Stack.Screen name="downloadsView" options={{ headerShown: false }} />
          </Stack>
        </DownloadersQueueProvider>
      </AccountSheetProvider>
    </ExternalResolutionProvider>
  );
}
