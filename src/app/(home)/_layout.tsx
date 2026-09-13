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
import { useWantArrivalWatcher } from '@/features/wants/useWantArrivalWatcher';
import { AccountSheetProvider } from '@/contexts/AccountSheetContext';

/**
 * The outer authenticated layout: providers, watchers, and the app-wide sync
 * effects. Every browsing route the app can reach after login lives inside
 * `(tabs)`, which owns its own Tabs + per-tab Stack. Detail routes (album,
 * artist, playlist, radio, podcasts, shares, downloads, genres, library
 * collections) live in the shared `(tabs)/(home,search,library)/` group so
 * they push onto the currently-focused tab's stack — the tab bar and
 * PlayingBar stay docked below across the whole browse session.
 *
 * `settings/` deliberately does NOT live in that shared group. Settings is
 * global app configuration, not tab-scoped content, and a shared-group route
 * is compiled once per tab: opening it from Home and again from Library built
 * two independent Settings stacks, each remembering its own sub-page, so the
 * app could hold three at once and returning to a tab restored whichever
 * sub-page that tab had been left on. Here it is one screen on the root
 * stack, presented full-screen — a single instance that covers the dock and
 * dismisses back to whichever tab opened it, with that tab untouched
 * underneath.
 *
 * `fullScreenModal` is an iOS distinction: react-native-screens maps it to
 * UIModalPresentationFullScreen there, and on Android every modal
 * presentation falls back to an ordinary push. So Android behaves exactly as
 * it did when settings was a tab route — hardware back pops it — and the only
 * change on that platform is that the push now lands on the root stack, above
 * the dock, rather than inside a tab's stack beneath it.
 */
export default function HomeLayout() {
  const { sync } = useSync();
  const dispatch = useDispatch();
  const isOffline = useIsOffline();
  const isOfflineRef = useRef(isOffline);
  const appState = useRef(AppState.currentState);
  const activeServerId = useSelector(selectActiveServerId);
  const prevServerIdRef = useRef<string | null | undefined>(undefined);

  // Presence-based arrival detection for Wants (C4): watches the synced
  // library (refreshed by DownloadersQueueProvider's own poll/staggered-sync
  // loop below, which is untouched by this) and resolves any want whose
  // entity has actually shown up, by any route — never gated on jobRef.
  useWantArrivalWatcher();

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
            <Stack.Screen name="settings" options={{ presentation: 'fullScreenModal' }} />
          </Stack>
        </DownloadersQueueProvider>
      </AccountSheetProvider>
    </ExternalResolutionProvider>
  );
}
