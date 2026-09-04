import { Stack, useRouter, usePathname, useSegments } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useSelector, useDispatch } from 'react-redux';
import { Home, Library, Search } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useSync } from '@/hooks/useSync';
import { useIsOffline } from '@/hooks/useIsOffline';
import { useTheme } from '@/hooks/useTheme';
import { useRadius } from '@/hooks/useRadius';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import { clearLibrary } from '@/utils/redux/slices/librarySlice';
import { clearLibraryStarred } from '@/utils/redux/slices/libraryStarredSlice';
import PlayingBar from '@/screens/playing/playingBar/PlayingBar';
import { ExternalResolutionProvider } from '@/features/sources/ExternalResolutionProvider';
import { ServerReachabilityWatcher } from '@/features/connectivity/ServerReachabilityWatcher';
import { AutoDownloadWatcher } from '@/features/downloads/AutoDownloadWatcher';
import { DownloadersQueueProvider } from '@/features/downloaders/DownloadersQueueContext';
import { AccountSheetProvider } from '@/contexts/AccountSheetContext';
import Touchable from '@/components/Touchable';
import { spacing } from '@/constants/design';

type TabKey = 'home' | 'search' | 'library';

/**
 * Which tab (if any) the current route belongs to.
 *
 * usePathname() returns the URL, which strips `(group)` segments — so an
 * album pushed from library and one pushed from home both read as
 * `/albumView`. Segments preserve `(tabs)`/`(home)` so we can tell whether
 * the current route is a tab root or a detail push. On a detail push the
 * segment array doesn't include `(tabs)`, so we hold whichever tab the
 * user last visited (kept at module scope so a layout remount doesn't
 * flip the indicator back to Home mid-transition).
 */
function tabForSegments(segments: readonly string[]): TabKey | null {
  const tabsIdx = segments.indexOf('(tabs)');
  if (tabsIdx === -1) return null;
  const child = segments[tabsIdx + 1];
  if (!child) return 'home';
  if (child === 'index') return 'home';
  if (child === 'search') return 'search';
  if (child === 'library') return 'library';
  return null;
}

let lastVisitedTab: TabKey = 'home';

function TabButton({
  onPress,
  active,
  accessibilityLabel,
  testID,
  activeColor,
  inactiveColor,
  activeIndicatorBg,
  children,
}: {
  onPress: () => void;
  active: boolean;
  accessibilityLabel: string;
  testID: string;
  activeColor: string;
  inactiveColor: string;
  activeIndicatorBg: string;
  children: (color: string) => React.ReactNode;
}) {
  const rad = useRadius();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    opacity.value = reduced
      ? (active ? 1 : 0)
      : withTiming(active ? 1 : 0, { duration: 200 });
  }, [active, opacity, reduced]);

  const indicatorStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Touchable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tab"
      testID={testID}
      style={styles.tab}
      onPress={onPress}
      feedback="control"
    >
      <Animated.View
        style={[
          styles.activeIndicator,
          { backgroundColor: activeIndicatorBg, borderRadius: rad.md },
          indicatorStyle,
        ]}
      />
      {children(active ? activeColor : inactiveColor)}
    </Touchable>
  );
}

export default function HomeLayout() {
  const { sync } = useSync();
  const dispatch = useDispatch();
  const isOffline = useIsOffline();
  const isOfflineRef = useRef(isOffline);
  const appState = useRef(AppState.currentState);
  const activeServerId = useSelector(selectActiveServerId);
  const prevServerIdRef = useRef<string | null | undefined>(undefined);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments() as readonly string[];
  const { isDarkMode, colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);

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
  useEffect(() => {
    const prev = prevServerIdRef.current;
    prevServerIdRef.current = activeServerId;
    if (prev && activeServerId && prev !== activeServerId) {
      clearLibrary(dispatch);
      dispatch(clearLibraryStarred());
      if (!isOfflineRef.current) sync();
    }
  }, [activeServerId, dispatch, sync]);

  const [activeTab, setActiveTab] = useState<TabKey>(
    () => tabForSegments(segments) ?? lastVisitedTab
  );
  useEffect(() => {
    const next = tabForSegments(segments);
    if (next) {
      lastVisitedTab = next;
      setActiveTab(next);
    }
    // Depend on the joined segments string so React sees a stable change key —
    // the array identity is fresh every render.
  }, [segments.join('/')]);

  const activeColor = themeColor;
  const inactiveColor = colors.subtext;
  const activeIndicatorBg = isDarkMode ? `${themeColor}28` : `${themeColor}18`;

  // Glass tint. iOS gets a native BlurView; Android gets a translucent tint
  // (Android's software blur is expensive and rarely worth it).
  const blurTint = isDarkMode ? 'dark' : 'light';
  const androidTint = useMemo(
    () => (isDarkMode ? 'rgba(18,18,18,0.92)' : 'rgba(255,255,255,0.94)'),
    [isDarkMode]
  );
  const hairline = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  const isHome = activeTab === 'home';
  const isSearch = activeTab === 'search';
  const isLibrary = activeTab === 'library';

  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <ExternalResolutionProvider>
      <AccountSheetProvider>
        <DownloadersQueueProvider>
          <ServerReachabilityWatcher />
          <AutoDownloadWatcher />
          <View style={styles.root}>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" options={{ animation: 'none' }} />
              <Stack.Screen name="albumView" />
              <Stack.Screen name="artistView" />
              <Stack.Screen name="playlistView" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="libraryCollectionView" />
              <Stack.Screen name="genresView" />
              <Stack.Screen name="genreView" />
              <Stack.Screen name="radio" />
              <Stack.Screen name="podcasts" />
              <Stack.Screen name="podcastChannel" />
              <Stack.Screen name="shares" />
              <Stack.Screen name="downloadsView" />
            </Stack>

            <View
              style={[styles.dock, { paddingBottom: bottomPad }]}
              onStartShouldSetResponder={() => true}
            >
              {Platform.OS === 'ios' ? (
                <BlurView
                  tint={blurTint}
                  intensity={80}
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: androidTint }]} />
              )}
              <View style={[styles.hairline, { backgroundColor: hairline }]} />

              <PlayingBar />

              <View style={styles.tabRow}>
                <TabButton
                  onPress={() => {
                    if (pathname === '/') return;
                    router.navigate('/(home)/(tabs)');
                  }}
                  active={isHome}
                  accessibilityLabel="Home tab"
                  testID="home-tab"
                  activeColor={activeColor}
                  inactiveColor={inactiveColor}
                  activeIndicatorBg={activeIndicatorBg}
                >
                  {color => <Home size={24} color={color} />}
                </TabButton>
                <TabButton
                  onPress={() => {
                    if (pathname === '/search') return;
                    router.navigate('/(home)/(tabs)/search');
                  }}
                  active={isSearch}
                  accessibilityLabel="Search tab"
                  testID="search-tab"
                  activeColor={activeColor}
                  inactiveColor={inactiveColor}
                  activeIndicatorBg={activeIndicatorBg}
                >
                  {color => <Search size={24} color={color} />}
                </TabButton>
                <TabButton
                  onPress={() => {
                    if (pathname === '/library') return;
                    router.navigate('/(home)/(tabs)/library');
                  }}
                  active={isLibrary}
                  accessibilityLabel="Library tab"
                  testID="library-tab"
                  activeColor={activeColor}
                  inactiveColor={inactiveColor}
                  activeIndicatorBg={activeIndicatorBg}
                >
                  {color => <Library size={24} color={color} />}
                </TabButton>
              </View>
            </View>
          </View>
        </DownloadersQueueProvider>
      </AccountSheetProvider>
    </ExternalResolutionProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  hairline: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: StyleSheet.hairlineWidth,
  },
  tabRow: {
    flexDirection: 'row',
    paddingTop: spacing.sm,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    width: 64,
    height: 36,
    alignSelf: 'center',
  },
});
