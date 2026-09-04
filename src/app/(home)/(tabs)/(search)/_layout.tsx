import { Stack } from 'expo-router';

/** Search-tab stack. See (home)/_layout.tsx for the reasoning. */
export default function SearchStackLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
