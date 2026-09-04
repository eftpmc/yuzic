import { Tabs } from 'expo-router';

/**
 * The visible tab bar is a docked overlay owned by (home)/_layout.tsx — a
 * flat panel that carries the PlayingBar on top of the tab row and stays
 * pinned to the bottom regardless of Stack depth (so pushing an album from
 * the home tab doesn't hide the tabs or the mini-player).
 *
 * This layout still uses expo-router's Tabs so React Navigation owns focus
 * state, freezeOnBlur, and the tab-press semantics — we just render nothing
 * in place of its bar.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{ headerShown: false, freezeOnBlur: true }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="search" />
      <Tabs.Screen name="library" />
    </Tabs>
  );
}
