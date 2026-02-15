import React, { forwardRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useDispatch, useSelector } from 'react-redux';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

import {
  selectThemeColor,
  selectIsGridView,
  selectGridColumns,
  selectGridSpacing,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setIsGridView,
  setGridColumns,
  setGridSpacing,
} from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';

const GridSettingsBottomSheet = forwardRef<BottomSheetModal>(
  (_, ref) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const themeColor = useSelector(selectThemeColor);
    const isGridView = useSelector(selectIsGridView);
    const gridColumns = useSelector(selectGridColumns);
    const gridSpacing = useSelector(selectGridSpacing);
    const { isDarkMode } = useTheme();

    const snapPoints = useMemo(() => ['45%'], []);

    const viewOptions = [
      {
        value: false,
        label: t('home.displaySheet.list', { defaultValue: 'List' }),
        icon: 'list-outline' as const,
      },
      {
        value: true,
        label: t('home.displaySheet.grid', { defaultValue: 'Grid' }),
        icon: 'grid-outline' as const,
      },
    ];

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
        <BottomSheetView style={styles.container}>
          <Text style={[styles.title, isDarkMode && styles.titleDark]}>
            {t('home.displaySheet.title', { defaultValue: 'Display' })}
          </Text>

          {/* View mode picker rows */}
          {viewOptions.map((option) => {
            const isSelected = isGridView === option.value;

            return (
              <TouchableOpacity
                key={String(option.value)}
                style={[
                  styles.pickerItem,
                  {
                    backgroundColor: isSelected
                      ? themeColor + '22'
                      : 'transparent',
                  },
                ]}
                onPress={() => dispatch(setIsGridView(option.value))}
              >
                <View style={styles.pickerLeft}>
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={
                      isSelected
                        ? themeColor
                        : isDarkMode ? '#ccc' : '#555'
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

          {/* Grid-only settings */}
          {isGridView && (
            <View style={styles.slidersSection}>
              {/* Columns slider */}
              <View style={styles.sliderRow}>
                <View style={styles.sliderHeader}>
                  <Text style={[styles.sliderLabel, isDarkMode && styles.sliderLabelDark]}>
                    {t('home.displaySheet.columns', { defaultValue: 'Columns' })}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: themeColor + '22' }]}>
                    <Text style={[styles.badgeText, { color: themeColor }]}>
                      {gridColumns}
                    </Text>
                  </View>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={2}
                  maximumValue={5}
                  step={1}
                  value={gridColumns}
                  onValueChange={(val) => dispatch(setGridColumns(Math.round(val)))}
                  minimumTrackTintColor={themeColor}
                  maximumTrackTintColor={isDarkMode ? '#555' : '#ccc'}
                  thumbTintColor={themeColor}
                />
              </View>

              {/* Spacing slider */}
              <View style={styles.sliderRow}>
                <View style={styles.sliderHeader}>
                  <Text style={[styles.sliderLabel, isDarkMode && styles.sliderLabelDark]}>
                    {t('home.displaySheet.spacing', { defaultValue: 'Spacing' })}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: themeColor + '22' }]}>
                    <Text style={[styles.badgeText, { color: themeColor }]}>
                      {gridSpacing}px
                    </Text>
                  </View>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={2}
                  maximumValue={16}
                  step={2}
                  value={gridSpacing}
                  onValueChange={(val) => dispatch(setGridSpacing(Math.round(val)))}
                  minimumTrackTintColor={themeColor}
                  maximumTrackTintColor={isDarkMode ? '#555' : '#ccc'}
                  thumbTintColor={themeColor}
                />
              </View>
            </View>
          )}

          {/* Bottom padding for dynamic sizing */}
          <View style={{ height: 16 }} />
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

export default GridSettingsBottomSheet;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  titleDark: {
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
  slidersSection: {
    marginTop: 12,
  },
  sliderRow: {
    marginBottom: 12,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sliderLabel: {
    fontSize: 16,
    color: '#333',
  },
  sliderLabelDark: {
    color: '#fff',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
