import { Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState, View } from 'react-native';
import PlayingBarHolder from "@/screens/playing/playingBar/PlayingBarHolder";
import { useSync } from '@/hooks/useSync';

export default function HomeLayout() {
    const { sync, syncPlaylists } = useSync()
    const appState = useRef(AppState.currentState)

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

    return (
        <View style={{flex: 1}}>
        <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="search" options={{ headerShown: false, animation: "fade", animationDuration: 150 }} />
            <Stack.Screen name="albumView" options={{ headerShown: false }} />
            <Stack.Screen name="externalAlbumView" options={{ headerShown: false }} />
            <Stack.Screen name="externalArtistView" options={{ headerShown: false }} />
            <Stack.Screen name="artistView" options={{ headerShown: false }} />
            <Stack.Screen name="playlistView" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="categoryList" options={{ headerShown: false }} />
            <Stack.Screen name="albumCollection" options={{ headerShown: false }} />
        </Stack>
            <PlayingBarHolder />
        </View>
    );
}