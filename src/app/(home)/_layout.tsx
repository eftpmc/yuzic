import { Stack } from 'expo-router';
import {View} from "react-native";
import PlayingBarHolder from "@/screens/playing/playingBar/PlayingBarHolder";

export default function HomeLayout() {
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
        </Stack>
            <PlayingBarHolder />
        </View>
    );
}