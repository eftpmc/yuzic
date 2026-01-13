import React from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { FilterPill } from './FilterPill';
import { useTheme } from '@/hooks/useTheme';

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
  value: T;
  filters: readonly Filter<T>[];
  onChange: (value: T) => void;
};

export default function LibraryFilterBar<T extends string>({
  value,
  filters,
  onChange,
}: Props<T>) {
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);

  const activeTextColor = isColorLight(themeColor) ? '#000' : '#fff';
  const inactiveTextColor = isDarkMode ? '#aaa' : '#666';

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {filters.map(filter => (
          <FilterPill
            key={filter.value}
            label={filter.label}
            value={filter.value}
            active={value === filter.value}
            activeBackgroundColor={themeColor}
            activeTextColor={activeTextColor}
            inactiveTextColor={inactiveTextColor}
            onPress={onChange}
          />
        ))}
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
    paddingHorizontal: 8,
  },
});