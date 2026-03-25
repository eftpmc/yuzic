import { Stack, useRouter, usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Home, Library } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
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
    const tabRowHeight = 44 + Math.max(insets.bottom, 8)

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

    const isLibrary = pathname === '/library'
    const isHome = !isLibrary
    const activeColor = themeColor
    const inactiveColor = isDarkMode ? '#555' : '#aaa'
    const borderColor = isDarkMode ? '#1C1C1E' : '#E5E5E5'
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

            <View style={[styles.tabRow, { paddingBottom: Math.max(insets.bottom, 8), backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
                {!isDarkMode && (
                    <BlurView
                        intensity={100}
                        tint="light"
                        style={[StyleSheet.absoluteFill, styles.tabBorder, { borderTopColor: borderColor }]}
                    />
                )}
                {isDarkMode && (
                    <View style={[StyleSheet.absoluteFill, styles.tabBorder, { borderTopColor: borderColor }]} />
                )}
                <TabIcon
                    onPress={() => router.navigate('/')}
                    active={isHome}
                    activeColor={activeColor}
                    inactiveColor={inactiveColor}
                    activeIndicatorBg={activeIndicatorBg}
                >
                    {color => <Home size={24} color={color} />}
                </TabIcon>
                <TabIcon
                    onPress={() => router.navigate('/library')}
                    active={isLibrary}
                    activeColor={activeColor}
                    inactiveColor={inactiveColor}
                    activeIndicatorBg={activeIndicatorBg}
                >
                    {color => <Library size={24} color={color} />}
                </TabIcon>
            </View>

            <View style={[styles.playingBarHolder, { bottom: tabRowHeight }]}>
                <PlayingBar />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    tabRow: {
        flexDirection: 'row',
        paddingTop: 12,
    },
    tabBorder: {
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
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
