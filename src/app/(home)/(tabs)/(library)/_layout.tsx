import { Stack } from 'expo-router';

/** Library-tab stack. See (home)/_layout.tsx for the reasoning. */
export default function LibraryStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
