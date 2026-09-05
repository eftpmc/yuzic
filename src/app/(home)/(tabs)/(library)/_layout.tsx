import { Stack } from 'expo-router';

// Declares this stack's root rather than letting expo-router infer one from
// the group name. A deep link straight to a detail route (an album, an artist)
// pushes `index` underneath it first, so there is always something to go back
// to.
export const unstable_settings = { anchor: 'index' };

/** Library-tab stack. See (home)/_layout.tsx for the reasoning. */
export default function LibraryStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
