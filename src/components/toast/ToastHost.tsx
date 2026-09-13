import React, { useContext } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/design';
import Toast from './Toast';
import { notify, useToasts } from './notify';

/**
 * Renders the active toast stack. Mounted once, high in the tree but below the
 * sheet portal, so toasts float over the app and the dock. Newest at the
 * bottom, nearest the thumb.
 *
 * Sits above the tab dock (which grows to include the playing bar when a track
 * is loaded) by reading the bottom-tab height from context rather than guessing;
 * falls back to the safe-area inset plus generous clearance outside a tab
 * navigator (onboarding, modals).
 */
const ToastHost: React.FC = () => {
  const toasts = useToasts();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext);

  if (toasts.length === 0) return null;

  const bottom = (tabBarHeight ?? insets.bottom + spacing.xxxl) + spacing.md;

  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom }]}>
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onDismiss={notify.dismiss} />
      ))}
    </View>
  );
};

export default ToastHost;

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing.page,
    right: spacing.page,
    alignItems: 'stretch',
  },
});
