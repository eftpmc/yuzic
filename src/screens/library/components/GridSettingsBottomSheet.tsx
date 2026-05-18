import React, { forwardRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Check, Grid2x2, List } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useDispatch, useSelector } from 'react-redux';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

import {
  selectThemeColor,
  selectIsGridView,
  selectGridColumns,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setIsGridView,
  setGridColumns,
} from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';

const GridSettingsBottomSheet = forwardRef<BottomSheetModal>(
  (_, ref) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const themeColor = useSelector(selectThemeColor);
    const isGridView = useSelector(selectIsGridView);
    const gridColumns = useSelector(selectGridColumns);
    const { colors } = useTheme();

    const snapPoints = useMemo(() => ['34%'], []);

    const viewOptions = [
      {
        value: false,
        label: t('home.displaySheet.list', { defaultValue: 'List' }),
        Icon: List,
      },
      {
        value: true,
        label: t('home.displaySheet.grid', { defaultValue: 'Grid' }),
        Icon: Grid2x2,
      },
    ];

    return (
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: colors.card }}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
      >
        <BottomSheetView style={styles.container}>
          <Text style={[styles.title, { color: colors.secondary }]}>
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
                  <option.Icon
                    size={18}
                    color={
                      isSelected ? themeColor : colors.subtext
                    }
                    style={{ marginRight: 10 }}
                  />
                  <Text
                    style={[styles.pickerText, { color: colors.secondary, fontWeight: isSelected ? '600' : '400' }]}
                  >
                    {option.label}
                  </Text>
                </View>

                {isSelected && (
                  <Check size={20} color={themeColor} />
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
                  <Text style={[styles.sliderLabel, { color: colors.secondary }]}>
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
                  maximumTrackTintColor={colors.border}
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

GridSettingsBottomSheet.displayName = 'GridSettingsBottomSheet';

export default GridSettingsBottomSheet;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
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
