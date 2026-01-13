import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import { ToggleRow } from '@/components/rows/ToggleRow';
import {
  selectThemeColor,
  selectAiButtonEnabled,
  selectInternalOnlyEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setAiButtonEnabled,
  setInternalOnlyEnabled,
} from '@/utils/redux/slices/settingsSlice';

export const AppearanceToggles: React.FC = () => {
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const aiButtonEnabled = useSelector(selectAiButtonEnabled);
  const internalEnabled = useSelector(selectInternalOnlyEnabled);

  return (
    <View style={styles.container}>
      <ToggleRow
        label="Internal data only"
        value={internalEnabled}
        activeColor={themeColor}
        onToggle={() =>
          dispatch(setInternalOnlyEnabled(!internalEnabled))
        }
      />

      <ToggleRow
        label="Text-to-Music button"
        value={aiButtonEnabled}
        activeColor={themeColor}
        onToggle={() =>
          dispatch(setAiButtonEnabled(!aiButtonEnabled))
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
});
