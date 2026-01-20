import React, { forwardRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

type SortOrder = 'title' | 'recent' | 'userplays' | 'year';

interface SortBottomSheetProps {
  sortOrder: SortOrder;
  onSelect: (value: SortOrder) => void;
}

const sortOptions = [
  { value: 'title', label: 'Alphabetical', icon: 'text-outline' },
  { value: 'year', label: 'Release Year', icon: 'calendar-outline' },
  { value: 'userplays', label: 'Most Played', icon: 'flame-outline' },
  { value: 'recent', label: 'Most Recent', icon: 'time-outline' },
] as const;

const SortBottomSheet = forwardRef<
  BottomSheetModal,
  SortBottomSheetProps
>(({ sortOrder, onSelect }, ref) => {
  const themeColor = useSelector(selectThemeColor);
  const { isDarkMode } = useTheme();

  const snapPoints = useMemo(() => ['40%'], []);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      backgroundStyle={{
        backgroundColor: isDarkMode ? '#222' : '#f9f9f9',
      }}
      handleIndicatorStyle={{
        backgroundColor: isDarkMode ? '#555' : '#ccc',
      }}
    >
      <BottomSheetView style={styles.sheetContainer}>
        <Text
          style={[
            styles.sheetTitle,
            isDarkMode && styles.sheetTitleDark,
          ]}
        >
          Sort by
        </Text>

        {sortOptions.map(option => {
          const isSelected = sortOrder === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.pickerItem,
                {
                  backgroundColor: isSelected
                    ? themeColor + '22'
                    : 'transparent',
                },
              ]}
              onPress={() => onSelect(option.value)}
            >
              <View style={styles.pickerLeft}>
                <Ionicons
                  name={option.icon}
                  size={18}
                  color={
                    isSelected
                      ? themeColor
                      : isDarkMode
                      ? '#ccc'
                      : '#555'
                  }
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[
                    styles.pickerText,
                    isDarkMode && styles.pickerTextDark,
                    { fontWeight: isSelected ? '600' : '400' },
                  ]}
                >
                  {option.label}
                </Text>
              </View>

              {isSelected && (
                <Ionicons
                  name="checkmark"
                  size={20}
                  color={themeColor}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

export default SortBottomSheet;

const styles = StyleSheet.create({
  sheetContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  sheetTitleDark: {
    color: '#fff',
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  pickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerText: {
    fontSize: 16,
    color: '#333',
  },
  pickerTextDark: {
    color: '#fff',
  },
});