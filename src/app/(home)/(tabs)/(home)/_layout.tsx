import { Stack } from 'expo-router';

// Declares this stack's root rather than letting expo-router infer one from
// the group name. A deep link straight to a detail route (an album, an artist)
// pushes `index` underneath it first, so there is always something to go back
// to.
export const unstable_settings = { anchor: 'index' };

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
