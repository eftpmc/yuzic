import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      screenOptions={{ headerShown: false, freezeOnBlur: true }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="library" />
    </Tabs>
  );
}
