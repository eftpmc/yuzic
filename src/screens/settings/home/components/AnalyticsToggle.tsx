import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { setAnalyticsEnabled } from '@/utils/redux/slices/settingsSlice';
import {
  enableAnalytics,
  disableAnalytics,
} from '@/utils/analytics/amplitude';
import {
  selectAnalyticsEnabled,
  selectThemeColor,
} from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

export const AnalyticsToggle: React.FC = () => {
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();

  const analyticsEnabled = useSelector(selectAnalyticsEnabled);
  const themeColor = useSelector(selectThemeColor);

  const toggleAnalytics = () => {
    const next = !analyticsEnabled;

    dispatch(setAnalyticsEnabled(next));

    if (next) {
      enableAnalytics();
    } else {
      disableAnalytics();
    }
  };

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <View style={styles.text}>
        <Text style={[styles.title, isDarkMode && styles.titleDark]}>
          Anonymous analytics
        </Text>
        <Text style={[styles.subtitle, isDarkMode && styles.subtitleDark]}>
          Helps improve the app
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.85}
        onPress={toggleAnalytics}
        style={[
          styles.switch,
          {
            backgroundColor: analyticsEnabled
              ? themeColor
              : isDarkMode
                ? '#333'
                : '#E5E5EA',
          },
        ]}
      >
        <View
          style={[
            styles.thumb,
            analyticsEnabled && styles.thumbActive,
          ]}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#1C1C1E',
  },

  text: {
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  titleDark: {
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#6E6E73',
    marginTop: 2,
  },
  subtitleDark: {
    color: '#aaa',
  },

  switch: {
    width: 46,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: '#fff',
    transform: [{ translateX: 2 }],
  },
  thumbActive: {
    transform: [{ translateX: 20 }],
  },
});