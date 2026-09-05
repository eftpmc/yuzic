import React from 'react';
import { Tabs } from 'expo-router';
import { StyleSheet, View, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Home, Library, Search } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import PlayingBar from '@/screens/playing/playingBar/PlayingBar';
import Touchable from '@/components/Touchable';
import { useTheme } from '@/hooks/useTheme';
import { useRadius } from '@/hooks/useRadius';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { spacing } from '@/constants/design';

/**
 * The tab bar is a real react-navigation bottom tab bar now: the tab-tracking
 * gymnastics that used to live in (home)/_layout.tsx (segment sniffing,
 * module-scope lastVisitedTab, hand-rolled navigation) are gone — React
 * Navigation knows which tab is focused and calls onPress correctly.
 *
 * PlayingBar renders inside this same tabBar surface so the two are one
 * docked panel at the bottom of the tab screens. Pushing a Stack.Screen
 * from a tab (an album, artist, settings) will hide both together, which
 * matches how every other music app treats its detail views.
 */
// The tab you land on when something navigates to `(tabs)` as a whole.
// Without this, expo-router infers the anchor by looking for a child whose
// route matches the group name — `(tabs)` has no such child, so the landing
// tab was decided by declaration order. Naming it keeps that from shifting
// when tabs are added or reordered.
export const unstable_settings = { anchor: '(home)' };

function TabButton({
  onPress,
  active,
  accessibilityLabel,
  testID,
  activeColor,
  inactiveColor,
  activeIndicatorBg,
  children,
}: {
  onPress: () => void;
  active: boolean;
  accessibilityLabel: string;
  testID: string;
  activeColor: string;
  inactiveColor: string;
  activeIndicatorBg: string;
  children: (color: string) => React.ReactNode;
}) {
  const rad = useRadius();
  const reduced = useReducedMotion();
  const opacity = useSharedValue(active ? 1 : 0);

  React.useEffect(() => {
    opacity.value = reduced
      ? (active ? 1 : 0)
      : withTiming(active ? 1 : 0, { duration: 200 });
  }, [active, opacity, reduced]);

  const indicatorStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Touchable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="tab"
      testID={testID}
      style={styles.tab}
      onPress={onPress}
      feedback="control"
    >
      <Animated.View
        style={[
          styles.activeIndicator,
          { backgroundColor: activeIndicatorBg, borderRadius: rad.md },
          indicatorStyle,
        ]}
      />
      {children(active ? activeColor : inactiveColor)}
    </Touchable>
  );
}

function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDarkMode, colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const { t } = useTranslation();

  const activeColor = themeColor;
  const inactiveColor = colors.subtext;
  const activeIndicatorBg = isDarkMode ? `${themeColor}28` : `${themeColor}18`;

  // Each tab is a Stack group — `(home)`, `(search)`, `(library)`.
  const focusedRouteName = state.routes[state.index]?.name;

  const go = (name: string) => {
    const target = state.routes.find(r => r.name === name);
    if (!target) return;
    // Standard react-navigation tab-press semantics: if it's a jump between
    // tabs, navigate; if the user re-taps the current tab, popToTop so a
    // deep detail push goes back to the tab root.
    const event = navigation.emit({ type: 'tabPress', target: target.key, canPreventDefault: true });
    if (focusedRouteName !== name && !event.defaultPrevented) {
      navigation.navigate(target.name as never);
    }
  };

  return (
    // One surface, edge to edge. The now-playing row and the tab row are two
    // rows of the same dock rather than a card parked on a slab. A hairline
    // along the top separates it from the content; the playing bar's own
    // progress rule, now edge to edge, separates the two rows.
    <View
      style={[
        styles.panel,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 8),
        },
      ]}
    >
      <PlayingBar />
      <View style={styles.tabRow}>
        <TabButton
          onPress={() => go('(home)')}
          active={focusedRouteName === '(home)'}
          accessibilityLabel={t('tabs.home', 'Home tab')}
          testID="home-tab"
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          activeIndicatorBg={activeIndicatorBg}
        >
          {color => <Home size={24} color={color} />}
        </TabButton>
        <TabButton
          onPress={() => go('(search)')}
          active={focusedRouteName === '(search)'}
          accessibilityLabel={t('tabs.search', 'Search tab')}
          testID="search-tab"
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          activeIndicatorBg={activeIndicatorBg}
        >
          {color => <Search size={24} color={color} />}
        </TabButton>
        <TabButton
          onPress={() => go('(library)')}
          active={focusedRouteName === '(library)'}
          accessibilityLabel={t('tabs.library', 'Library tab')}
          testID="library-tab"
          activeColor={activeColor}
          inactiveColor={inactiveColor}
          activeIndicatorBg={activeIndicatorBg}
        >
          {color => <Library size={24} color={color} />}
        </TabButton>
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true,
        ...(Platform.OS === 'android' ? { tabBarStyle: { elevation: 0 } } : null),
      }}
    >
      <Tabs.Screen name="(home)" />
      <Tabs.Screen name="(search)" />
      <Tabs.Screen name="(library)" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  panel: {
    // No absolute positioning: react-navigation lays this out itself and
    // measures it for tab-bar-inset. Screens above get the room reserved
    // via tabBarHeight without us duplicating the math.
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabRow: {
    flexDirection: 'row',
    paddingTop: spacing.md,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  activeIndicator: {
    position: 'absolute',
    width: 64,
    height: 36,
    alignSelf: 'center',
  },
});
