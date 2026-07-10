import { Stack } from 'expo-router';

export default function LibraryLayout() {
    return (
        <Stack>
            <Stack.Screen name='index' options={{ headerShown: false, title: "Library" }} />
            <Stack.Screen name='playlists' options={{ headerShown: false, title: "Playlists" }} />
            <Stack.Screen name='albums' options={{ headerShown: false, title: "Albums" }} />
            <Stack.Screen name='artists' options={{ headerShown: false, title: "Artists" }} />
            <Stack.Screen name='songs' options={{ headerShown: false, title: "Songs" }} />
            <Stack.Screen name='genres' options={{ headerShown: false, title: "Genres" }} />
            <Stack.Screen name='downloaded' options={{ headerShown: false, title: "Downloaded" }} />
        </Stack>
    );
}
