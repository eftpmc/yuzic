import React, { useEffect, useRef } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { FilterPill } from './FilterPill';
import { useTheme } from '@/hooks/useTheme';
import { Earth, Inbox, Music } from 'lucide-react-native';

const isColorLight = (color: string) => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 128;
};

type Filter<T extends string> = {
  label: string;
  value: T;
};

type Props<T extends string> = {
  mode: 'home' | 'explore';
  value: T;
  filters: readonly Filter<T>[];
  onChange: (value: T) => void;
  onExplorePress: () => void;
};

export default function LibraryFilterBar<T extends string>({
  mode,
  value,
  filters,
  onChange,
  onExplorePress,
}: Props<T>) {
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);

  const inactiveTextColor = isDarkMode ? '#aaa' : '#666';
  const activeIconColor = isColorLight(themeColor) ? '#000' : '#fff';

  const filtersOpacity = useRef(new Animated.Value(1)).current;
  const filtersScale = useRef(new Animated.Value(1)).current;
  const filtersTranslateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(filtersOpacity, {
        toValue: mode === 'explore' ? 0 : 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(filtersScale, {
        toValue: mode === 'explore' ? 0.96 : 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(filtersTranslateX, {
        toValue: mode === 'explore' ? -4 : 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [mode]);

  const exploreActive = mode === 'explore';

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          onPress={onExplorePress}
          style={[
            styles.exploreButton,
            exploreActive && {
              backgroundColor: themeColor,
              borderColor: themeColor,
            },
          ]}
        >
          <Music
            size={18}
            color={exploreActive ? activeIconColor : inactiveTextColor}
          />
        </TouchableOpacity>

        <View style={styles.separator} />

        <Animated.View
          style={{
            flexDirection: 'row',
            opacity: filtersOpacity,
            transform: [
              { translateX: filtersTranslateX },
              { scaleX: filtersScale },
            ],
            pointerEvents: exploreActive ? 'none' : 'auto',
          }}
        >
          {filters.map(filter => (
            <FilterPill
              key={filter.value}
              label={filter.label}
              value={filter.value}
              active={value === filter.value}
              activeBackgroundColor={themeColor}
              activeTextColor={activeIconColor}
              inactiveTextColor={inactiveTextColor}
              onPress={onChange}
            />
          ))}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#D1D1D6',
  },
  containerDark: {
    borderBottomColor: '#1C1C1E',
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  exploreButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#555',
  },
  separator: {
    width: StyleSheet.hairlineWidth,
    height: 24,
    backgroundColor: '#888',
    opacity: 0.35,
    marginRight: 8,
  },
});