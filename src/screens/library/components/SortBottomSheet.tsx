import React, { forwardRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { ArrowDownAZ, Calendar, CalendarPlus, Check, Clock3, Flame } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import { radius, spacing, typography } from '@/constants/design';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import Touchable from '@/components/Touchable';

type SortOrder = 'title' | 'recent' | 'userplays' | 'year' | 'recentlyAdded';

interface SortBottomSheetProps {
  sortOrder: SortOrder;
  onSelect: (value: SortOrder) => void;
}

const SortBottomSheet = forwardRef<
  BottomSheetModal,
  SortBottomSheetProps
>(({ sortOrder, onSelect }, ref) => {
  const { t } = useTranslation();
  const themeColor = useSelector(selectThemeColor);
  const { colors } = useTheme();

  const sortOptions = [
    { value: 'recent' as const, label: t('home.sort.mostRecent'), Icon: Clock3 },
    { value: 'recentlyAdded' as const, label: t('home.sort.recentlyAdded'), Icon: CalendarPlus },
    { value: 'title' as const, label: t('home.sort.alphabetical'), Icon: ArrowDownAZ },
    { value: 'year' as const, label: t('home.sort.releaseYear'), Icon: Calendar },
    { value: 'userplays' as const, label: t('home.sort.mostPlayed'), Icon: Flame },
  ];

  const snapPoints = useMemo(() => ['48%'], []);

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
      <BottomSheetView style={styles.sheetContainer}>
        <Text
          style={[styles.sheetTitle, { color: colors.secondary }]}
        >
          {t('home.sortSheet.title')}
        </Text>

        {sortOptions.map(option => {
          const isSelected = sortOrder === option.value;

          return (
            <Touchable
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
                <option.Icon
                  size={18}
                  color={isSelected ? themeColor : colors.subtext}
                  style={{ marginRight: spacing.controlGap }}
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
            </Touchable>
          );
        })}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

SortBottomSheet.displayName = 'SortBottomSheet';

export default SortBottomSheet;

const styles = StyleSheet.create({
  sheetContainer: {
    paddingHorizontal: spacing.roomy,
    paddingTop: spacing.controlGap,
  },
  sheetTitle: {
    ...typography.sheetTitle,
    marginBottom: spacing.controlGap,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  pickerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickerText: {
    ...typography.body,
  },
});