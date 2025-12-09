import { Stack } from 'expo-router';

export default function SettingsLayout() {
    return (
        <Stack>
            <Stack.Screen name='index' options={{ headerShown: false, title: "Settings" }} />
            <Stack.Screen name='appearanceView' options={{ headerShown: false, title: "Appearances" }} />
            <Stack.Screen name='libraryView' options={{ headerShown: false, title: "Library" }} />
            <Stack.Screen name='playerView' options={{ headerShown: false, title: "Player" }} />
            <Stack.Screen name='serverView' options={{ headerShown: false, title: "Server" }} />
            <Stack.Screen name='lidarrView' options={{ headerShown: false, title: "Lidarr" }} />
            <Stack.Screen name='openaiView' options={{ headerShown: false, title: "OpenAI" }} />
        </Stack>
    );
}