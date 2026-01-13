import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Appearance,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { selectInternalOnlyEnabled, selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { setInternalOnlyEnabled } from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';

export const InternalToggle: React.FC = () => {
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const internalEnabled = useSelector(selectInternalOnlyEnabled);
  const { isDarkMode } = useTheme();

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <View style={styles.row}>
        <Text style={[styles.label, isDarkMode && styles.labelDark]}>
          Hide unowned albums
        </Text>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => dispatch(setInternalOnlyEnabled(!internalEnabled))}
          style={[
            styles.switch,
            {
              backgroundColor: internalEnabled
                ? themeColor
                : isDarkMode
                  ? '#333'
                  : '#ddd',
            },
          ]}
        >
          <View
            style={[
              styles.thumb,
              {
                backgroundColor: '#fff',
                transform: [
                  { translateX: internalEnabled ? 18 : 2 },
                ],
              },
            ]}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 24,
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 14,
    color: '#555',
    flexShrink: 1,
    paddingRight: 12,
  },
  labelDark: {
    color: '#aaa',
  },
  switch: {
    width: 44,
    height: 24,
    borderRadius: 8,
    justifyContent: 'center',
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 6,
    marginLeft: 2,
    elevation: 2,
  },
});