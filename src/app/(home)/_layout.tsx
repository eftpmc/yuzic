import { Stack, useRouter, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Home, Library } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useSync } from '@/hooks/useSync';
import { useTheme } from '@/hooks/useTheme';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import PlayingBar from '@/screens/playing/playingBar/PlayingBar';

function TabIcon({ onPress, active, activeColor, inactiveColor, activeIndicatorBg, children }: {
    onPress: () => void;
    active: boolean;
    activeColor: string;
    inactiveColor: string;
    activeIndicatorBg: string;
    children: (color: string) => React.ReactNode;
}) {
    const opacity = useSharedValue(active ? 1 : 0);

    useEffect(() => {
        opacity.value = withTiming(active ? 1 : 0, { duration: 200 });
    }, [active]);

    const indicatorStyle = useAnimatedStyle(() => ({
        opacity: opacity.value,
    }));

    return (
        <TouchableOpacity style={styles.tab} onPress={onPress}>
            <Animated.View style={[styles.activeIndicator, { backgroundColor: activeIndicatorBg }, indicatorStyle]} />
            {children(active ? activeColor : inactiveColor)}
        </TouchableOpacity>
    );
}

export default function HomeLayout() {
    const { sync, syncPlaylists } = useSync()
    const appState = useRef(AppState.currentState)
    const insets = useSafeAreaInsets()
    const router = useRouter()
    const pathname = usePathname()
    const { isDarkMode } = useTheme()
    const themeColor = useSelector(selectThemeColor)
    const tabRowHeight = 52 + Math.max(insets.bottom, 8)

    useEffect(() => {
        const sub = AppState.addEventListener('change', nextState => {
            if (appState.current.match(/inactive|background/) && nextState === 'active') {
                sync()
                syncPlaylists()
            }
            appState.current = nextState
        })
        return () => sub.remove()
    }, [sync, syncPlaylists])

    const [activeTab, setActiveTab] = useState<'home' | 'library'>('home')
    const afterDismissTarget = useRef<string | null>(null)

    useEffect(() => {
        if (pathname !== '/' && pathname !== '/library') return
        setActiveTab(pathname === '/library' ? 'library' : 'home')
        const target = afterDismissTarget.current
        afterDismissTarget.current = null
        if (target && target !== pathname) {
            requestAnimationFrame(() => router.replace(target as any))
        }
    }, [pathname])

    const isInChild = pathname !== '/' && pathname !== '/library'
    const isLibrary = activeTab === 'library'
    const isHome = activeTab === 'home'
    const activeColor = themeColor
    const inactiveColor = isDarkMode ? '#555' : '#aaa'
    const activeIndicatorBg = isDarkMode ? `${themeColor}28` : `${themeColor}18`

    return (
        <View style={{ flex: 1 }}>
            <Stack style={{ flex: 1 }}>
                <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
                <Stack.Screen name="search" options={{ headerShown: false, animation: "fade", animationDuration: 150 }} />
                <Stack.Screen name="albumView" options={{ headerShown: false }} />
                <Stack.Screen name="externalAlbumView" options={{ headerShown: false }} />
                <Stack.Screen name="externalArtistView" options={{ headerShown: false }} />
                <Stack.Screen name="artistView" options={{ headerShown: false }} />
                <Stack.Screen name="playlistView" options={{ headerShown: false }} />
                <Stack.Screen name="settings" options={{ headerShown: false }} />
                <Stack.Screen name="categoryList" options={{ headerShown: false }} />
                <Stack.Screen name="albumCollection" options={{ headerShown: false }} />
                <Stack.Screen name="downloadedList" options={{ headerShown: false }} />
                <Stack.Screen name="genreList" options={{ headerShown: false }} />
                <Stack.Screen name="genreView" options={{ headerShown: false }} />
            </Stack>

            <View style={[styles.tabGradientContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
                <LinearGradient
                    colors={isDarkMode
                        ? ['#00000000', '#000000F0', '#000000F0', '#000000']
                        : ['#ffffff00', '#fffffff0', '#fffffff0', '#ffffff']}
                    locations={[0, 0.2, 0.45, 0.6]}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                />
                <View style={styles.tabRow}>
                    <TabIcon
                        onPress={() => {
                            if (pathname === '/') return
                            if (!isInChild) { router.navigate('/'); return }
                            afterDismissTarget.current = '/'
                            router.dismissAll()
                        }}
                        active={isHome}
                        activeColor={activeColor}
                        inactiveColor={inactiveColor}
                        activeIndicatorBg={activeIndicatorBg}
                    >
                        {color => <Home size={24} color={color} />}
                    </TabIcon>
                    <TabIcon
                        onPress={() => {
                            if (pathname === '/library') return
                            if (!isInChild) { router.navigate('/library'); return }
                            afterDismissTarget.current = '/library'
                            router.dismissAll()
                        }}
                        active={isLibrary}
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
        paddingTop: 12,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        justifyContent: 'center',
    },
    activeIndicator: {
        position: 'absolute',
        width: 64,
        height: 36,
        borderRadius: 8,
        alignSelf: 'center',
    },
    playingBarHolder: {
        position: 'absolute',
        left: 0,
        right: 0,
    },
})
