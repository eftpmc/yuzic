import { Stack, useRouter, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

type TabKey = 'home' | 'search' | 'library'

function tabForPath(pathname: string): TabKey | null {
    if (pathname === '/') return 'home'
    if (pathname === '/search') return 'search'
    if (pathname === '/library') return 'library'
    return null
}

// Survives a HomeLayout remount. Without it, opening an album from Library
// would flip the indicator to Home for the frame the layout re-instantiates
// (expo-router remounts layout groups on some cross-stack pushes), which is
// exactly what "the fix didn't work" reproduced as in the field.
let lastVisitedTab: TabKey = 'home'
import { AppState, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { Home, Library, Search } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSync } from '@/hooks/useSync';
import { useIsOffline } from '@/hooks/useIsOffline';
import { useTheme } from '@/hooks/useTheme';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import { clearLibrary } from '@/utils/redux/slices/librarySlice';
import { clearLibraryStarred } from '@/utils/redux/slices/libraryStarredSlice';
import PlayingBar from '@/screens/playing/playingBar/PlayingBar';
import { ExternalResolutionProvider } from '@/features/sources/ExternalResolutionProvider';
import { ServerReachabilityWatcher } from '@/features/connectivity/ServerReachabilityWatcher';
import { AutoDownloadWatcher } from '@/features/downloads/AutoDownloadWatcher';
import { AccountSheetProvider } from '@/contexts/AccountSheetContext';
import Touchable from '@/components/Touchable';
import { spacing } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';
import { useReducedMotion } from '@/hooks/useReducedMotion';

function TabIcon({ onPress, active, accessibilityLabel, testID, activeColor, inactiveColor, activeIndicatorBg, children }: {
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
        // Under reduce-motion the indicator snaps to its target instead of
        // easing — same information, no travel.
        opacity.value = reduced
          ? (active ? 1 : 0)
          : withTiming(active ? 1 : 0, { duration: 200 });
    }, [active, opacity, reduced]);

    const indicatorStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <Touchable
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="tab"
            testID={testID}
            style={styles.tab}
            onPress={onPress}
            feedback="control"
        >
            <Animated.View style={[styles.activeIndicator, { backgroundColor: activeIndicatorBg, borderRadius: rad.md }, indicatorStyle]} />
            {children(active ? activeColor : inactiveColor)}
        </Touchable>
    );
}

export default function HomeLayout() {
    const { sync } = useSync()
    const dispatch = useDispatch()
    const isOffline = useIsOffline()
    const isOfflineRef = useRef(isOffline)
    const appState = useRef(AppState.currentState)
    const activeServerId = useSelector(selectActiveServerId)
    const prevServerIdRef = useRef<string | null | undefined>(undefined)
    const insets = useSafeAreaInsets()
    const router = useRouter()
    const pathname = usePathname()
    const { isDarkMode, colors } = useTheme()
    const themeColor = useSelector(selectThemeColor)
    const tabRowHeight = 52 + Math.max(insets.bottom, 8)

    useEffect(() => {
        isOfflineRef.current = isOffline
    }, [isOffline])

    useEffect(() => {
        const sub = AppState.addEventListener('change', nextState => {
            if (appState.current.match(/inactive|background/) && nextState === 'active') {
                if (!isOfflineRef.current) sync()
            }
            appState.current = nextState
        })
        return () => sub.remove()
    }, [sync])

    // Clear stale library data and re-sync when switching between two real servers.
    // Both values must be non-null to avoid triggering during persist rehydration
    // (null → real-id on cold start would otherwise be treated as a server switch).
    useEffect(() => {
        const prev = prevServerIdRef.current
        prevServerIdRef.current = activeServerId
        if (prev && activeServerId && prev !== activeServerId) {
            dispatch(clearLibrary())
            dispatch(clearLibraryStarred())
            if (!isOfflineRef.current) sync()
        }
    }, [activeServerId, dispatch, sync])

    // Which tab lit the current screen. Deep pushes (an album, an artist,
    // a genre, a library collection) sit above the tabs stack, so pathname
    // alone loses the origin — falling back to "not library, not search =
    // home" would flip the icon to Home the moment you opened a genre from
    // Library. Instead we remember the last tab root the user visited, and
    // hold it until they visit another one.
    //
    // The last-tab memory lives at module scope so it survives a HomeLayout
    // remount (expo-router remounts the group layout on cross-stack navigation,
    // which was flipping the indicator back to Home the moment you opened an
    // album from Library). Component state alone loses it; the module var
    // doesn't.
    const [activeTab, setActiveTab] = useState<TabKey>(() =>
      tabForPath(pathname) ?? lastVisitedTab
    )
    useEffect(() => {
        const next = tabForPath(pathname)
        if (next) {
            lastVisitedTab = next
            setActiveTab(next)
        }
    }, [pathname])
    const isHome = activeTab === 'home'
    const isSearch = activeTab === 'search'
    const isLibrary = activeTab === 'library'
    const activeColor = themeColor
    const inactiveColor = colors.subtext
    const activeIndicatorBg = isDarkMode ? `${themeColor}28` : `${themeColor}18`
    const bg = colors.background.length === 4
      ? `#${colors.background[1]}${colors.background[1]}${colors.background[2]}${colors.background[2]}${colors.background[3]}${colors.background[3]}`
      : colors.background

    return (
        <ExternalResolutionProvider>
        <AccountSheetProvider>
        <ServerReachabilityWatcher />
        <AutoDownloadWatcher />
        <View style={{ flex: 1 }}>
            <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
                <Stack.Screen name="albumView" options={{ headerShown: false }} />
                <Stack.Screen name="artistView" options={{ headerShown: false }} />
                <Stack.Screen name="playlistView" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
                <Stack.Screen name="libraryCollectionView" options={{ headerShown: false }} />
                <Stack.Screen name="genresView" options={{ headerShown: false }} />
                <Stack.Screen name="genreView" options={{ headerShown: false }} />
            </Stack>

            <View
                style={[styles.tabGradientContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}
                onStartShouldSetResponder={() => true}
            >
                <LinearGradient
                    colors={[`${bg}00`, `${bg}F0`, `${bg}F0`, bg] as any}
                    locations={[0, 0.2, 0.45, 0.6]}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.tabRow}>
                    <TabIcon
                        onPress={() => {
                            if (pathname === '/') return
                            router.navigate('/(home)/(tabs)')
                        }}
                        active={isHome}
                        accessibilityLabel="Home tab"
                        testID="home-tab"
                        activeColor={activeColor}
                        inactiveColor={inactiveColor}
                        activeIndicatorBg={activeIndicatorBg}
                    >
                        {color => <Home size={24} color={color} />}
                    </TabIcon>
                    <TabIcon
                        onPress={() => {
                            if (pathname === '/search') return
                            router.navigate('/(home)/(tabs)/search')
                        }}
                        active={isSearch}
                        accessibilityLabel="Search tab"
                        testID="search-tab"
                        activeColor={activeColor}
                        inactiveColor={inactiveColor}
                        activeIndicatorBg={activeIndicatorBg}
                    >
                        {color => <Search size={24} color={color} />}
                    </TabIcon>
                    <TabIcon
                        onPress={() => {
                            if (pathname === '/library') return
                            router.navigate('/(home)/(tabs)/library')
                        }}
                        active={isLibrary}
                        accessibilityLabel="Library tab"
                        testID="library-tab"
                        activeColor={activeColor}
                        inactiveColor={inactiveColor}
                        activeIndicatorBg={activeIndicatorBg}
                    >
                        {color => <Library size={24} color={color} />}
                    </TabIcon>
                </View>
            </View>

            <View style={[styles.playingBarHolder, { bottom: tabRowHeight }]}>
                <PlayingBar />
            </View>

        </View>
        </AccountSheetProvider>
        </ExternalResolutionProvider>
    );
}

const styles = StyleSheet.create({
    tabGradientContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 140,
        justifyContent: 'flex-end',
    },
    tabRow: {
        flexDirection: 'row',
        paddingTop: spacing.md,
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
    playingBarHolder: {
        position: 'absolute',
        left: 0,
        right: 0,
    },
})
