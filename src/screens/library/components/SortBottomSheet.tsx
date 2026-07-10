import React, { forwardRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { ArrowDownAZ, Calendar, CalendarPlus, Check, Clock3, Flame } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';

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
                <option.Icon
                  size={18}
                  color={isSelected ? themeColor : colors.subtext}
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
      </BottomSheetView>
    </BottomSheetModal>
  );
});

SortBottomSheet.displayName = 'SortBottomSheet';

export default SortBottomSheet;

const styles = StyleSheet.create({
  sheetContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sheetTitle: {
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
});