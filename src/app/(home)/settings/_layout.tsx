import { Stack } from 'expo-router';

export default function SettingsLayout() {
    return (
        <Stack>
            <Stack.Screen name='index' options={{ headerShown: false, title: "Settings" }} />
            <Stack.Screen name='appearanceView' options={{ headerShown: false, title: "Appearances" }} />
            <Stack.Screen name='libraryView' options={{ headerShown: false, title: "Library" }} />
            <Stack.Screen name='playerView' options={{ headerShown: false, title: "Playback" }} />
            <Stack.Screen name='serverView' options={{ headerShown: false, title: "Server" }} />
            <Stack.Screen name='downloadersView' options={{ headerShown: false, title: "Downloaders" }} />
            <Stack.Screen name='downloadsInfoView' options={{ headerShown: false, title: "Downloads" }} />
            <Stack.Screen name='lidarrView' options={{ headerShown: false, title: "Lidarr" }} />
            <Stack.Screen name='slskdView' options={{ headerShown: false, title: "slskd" }} />
            <Stack.Screen name='integrationsView' options={{ headerShown: false, title: "Integrations" }} />
            <Stack.Screen name='listenbrainzView' options={{ headerShown: false, title: "ListenBrainz" }} />
            <Stack.Screen name='lastfmView' options={{ headerShown: false, title: "Last.fm" }} />
            <Stack.Screen name='deezerView' options={{ headerShown: false, title: "Deezer" }} />
            <Stack.Screen name='musicbrainzView' options={{ headerShown: false, title: "MusicBrainz" }} />
        </Stack>
    );
}