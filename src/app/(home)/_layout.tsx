import { Stack, useRouter, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, View, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Home, Library } from 'lucide-react-native';
import { useSync } from '@/hooks/useSync';
import { useTheme } from '@/hooks/useTheme';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import PlayingBar from '@/screens/playing/playingBar/PlayingBar';

export default function HomeLayout() {
    const { sync, syncPlaylists } = useSync()
    const appState = useRef(AppState.currentState)
    const insets = useSafeAreaInsets()
    const router = useRouter()
    const pathname = usePathname()
    const { isDarkMode } = useTheme()
    const themeColor = useSelector(selectThemeColor)
    const [tabRowHeight, setTabRowHeight] = useState(0)

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
    const barBg = isDarkMode ? '#000' : '#fff'
    const borderColor = isDarkMode ? '#1C1C1E' : '#E5E5E5'

    return (
        <View style={{ flex: 1 }}>
            <Stack style={{ flex: 1 }}>
                <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
                <Stack.Screen name="library" options={{ headerShown: false, animation: 'none' }} />
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

            {/* Tab row — solid background, sits at the bottom */}
            <View
                style={[styles.tabRow, { backgroundColor: barBg, borderTopColor: borderColor, paddingBottom: Math.max(insets.bottom, 8) }]}
                onLayout={e => setTabRowHeight(e.nativeEvent.layout.height)}
            >
                <TouchableOpacity style={styles.tab} onPress={() => router.navigate('/')}>
                    <Home size={24} color={isHome ? activeColor : inactiveColor} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.tab} onPress={() => router.navigate('/library')}>
                    <Library size={24} color={isLibrary ? activeColor : inactiveColor} />
                </TouchableOpacity>
            </View>

            {/* Playing bar — absolutely positioned above the tab row, blurs screen content */}
            <View style={[styles.playingBarHolder, { bottom: tabRowHeight }]}>
                <PlayingBar />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    tabRow: {
        flexDirection: 'row',
        paddingTop: 4,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
    },
    playingBarHolder: {
        position: 'absolute',
        left: 0,
        right: 0,
    },
})
