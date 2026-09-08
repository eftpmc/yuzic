import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';

import { spacing } from '@/constants/design';
import { selectTranslucentDock } from '@/utils/redux/selectors/settingsSelectors';

/**
 * How much room a scrolling list should leave at its bottom.
 *
 * Normally just breathing room: the tab dock is laid out by react-navigation,
 * so screens already end at its top edge and don't have to account for it.
 *
 * With the translucent dock the tab bar is absolutely positioned and takes no
 * layout space — content runs underneath it, which is the point — so every
 * list has to reserve the dock's own height on top of that breathing room or
 * its last row sits behind the tabs forever.
 *
 * Reading the height from context rather than measuring it keeps the two in
 * step: the dock's height changes with the safe-area inset and with whether a
 * track is playing, and a hardcoded guess would be wrong on both counts.
 */
export function useScrollClearance(): number {
  const translucent = useSelector(selectTranslucentDock);
  // Null outside a tab navigator — modals and the onboarding stack render
  // without a dock, and want the plain value.
  const tabBarHeight = useContext(BottomTabBarHeightContext);

  if (!translucent || tabBarHeight == null) return spacing.scrollClearance;
  return tabBarHeight + spacing.scrollClearance;
}
