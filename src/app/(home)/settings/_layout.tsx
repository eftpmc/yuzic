import { Stack } from 'expo-router';

// Declares this stack's root. A deep link straight to a sub-page
// (/settings/serverView) pushes `index` underneath it first, so the back
// arrow always has somewhere to go — without it the header's router.back()
// would try to pop past the modal's own root.
export const unstable_settings = { anchor: 'index' };

/**
 * Settings lives on the root stack as a modal, not in the
 * `(home,search,library)` shared group — see `(home)/_layout.tsx`. That makes
 * it one instance for the whole app instead of one per tab.
 */
export default function SettingsLayout() {
    return (
        <Stack>
            <Stack.Screen name='index' options={{ headerShown: false, title: "Settings" }} />
            <Stack.Screen name='appearanceView' options={{ headerShown: false, title: "Appearances" }} />
            <Stack.Screen name='libraryView' options={{ headerShown: false, title: "Library" }} />
            <Stack.Screen name='homeView' options={{ headerShown: false, title: "Home" }} />
            <Stack.Screen name='playerView' options={{ headerShown: false, title: "Playback" }} />
            <Stack.Screen name='equalizerView' options={{ headerShown: false, title: "Equalizer" }} />
            <Stack.Screen name='serverView' options={{ headerShown: false, title: "Server" }} />
            <Stack.Screen name='connectionsView' options={{ headerShown: false, title: "Connections" }} />
            <Stack.Screen name='lidarrView' options={{ headerShown: false, title: "Lidarr" }} />
            <Stack.Screen name='slskdView' options={{ headerShown: false, title: "slskd" }} />
            <Stack.Screen name='soulsyncView' options={{ headerShown: false, title: "SoulSync" }} />
            <Stack.Screen name='listenbrainzView' options={{ headerShown: false, title: "ListenBrainz" }} />
            <Stack.Screen name='scrobblingView' options={{ headerShown: false, title: "Scrobbling" }} />
            <Stack.Screen name='deezerView' options={{ headerShown: false, title: "Deezer" }} />
            <Stack.Screen name='lastfmView' options={{ headerShown: false, title: "Last.fm" }} />
            <Stack.Screen name='musicbrainzView' options={{ headerShown: false, title: "MusicBrainz" }} />
            <Stack.Screen name='audiomuseView' options={{ headerShown: false, title: "AudioMuse-AI" }} />
            <Stack.Screen name='lyricsView' options={{ headerShown: false, title: "Lyrics" }} />
            <Stack.Screen name='searchView' options={{ headerShown: false, title: "Search" }} />
            <Stack.Screen name='metadataView' options={{ headerShown: false, title: "Metadata" }} />
        </Stack>
    );
}