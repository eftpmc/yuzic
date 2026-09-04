import { Stack } from 'expo-router';

/**
 * Home-tab stack. All the detail routes (album, artist, playlist, settings,
 * radio, podcasts, shares, downloads, genres, library collections) live in
 * the sibling `(home,search,library)/` shared group, so navigating to any of
 * them from the home tab pushes onto THIS stack — which keeps the tab bar
 * and PlayingBar docked below, visible for the whole browse session.
 */
export default function HomeStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
