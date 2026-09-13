import React, { forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import { useRadius } from '@/hooks/useRadius';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import Touchable from '@/components/Touchable';
import { iconSize, spacing, typography } from '@/constants/design';
import { withAlpha } from '@/features/theme/coverAccent';

export type SingleSelectOption = {
  value: string;
  label: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
};

type Props = {
  selected: string;
  options: SingleSelectOption[];
  title: string;
  snapPoint: string;
  onSelect: (value: string) => void;
};

const SingleSelectBottomSheet = forwardRef<BottomSheetModal, Props>(
  ({ selected, options, title, snapPoint, onSelect }, ref) => {
    const themeColor = useSelector(selectThemeColor);
    const { colors } = useTheme();
    const rad = useRadius();
    const snapPoints = useMemo(() => [snapPoint], [snapPoint]);

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
          <Text style={[styles.sheetTitle, { color: colors.secondary }]}>{title}</Text>
          {options.map(option => {
            const isSelected = selected === option.value;
            return (
              <Touchable
                key={option.value}
                style={[styles.pickerItem, {
                  backgroundColor: isSelected ? withAlpha(themeColor, 0.13) : 'transparent',
                  borderRadius: rad.md,
                }]}
                onPress={() => onSelect(option.value)}
              >
                <View style={styles.pickerLeft}>
                  <option.Icon size={iconSize.row} color={isSelected ? themeColor : colors.subtext} />
                  <Text style={[styles.pickerText, { color: colors.secondary, fontWeight: isSelected ? '600' : '400' }]}>
                    {option.label}
                  </Text>
                </View>
                {isSelected && <Check size={iconSize.control} color={themeColor} />}
              </Touchable>
            );
          })}
        </BottomSheetView>
      </BottomSheetModal>
    );
  }
);

SingleSelectBottomSheet.displayName = 'SingleSelectBottomSheet';
export default SingleSelectBottomSheet;

const styles = StyleSheet.create({
  sheetContainer: { paddingHorizontal: spacing.roomy, paddingTop: spacing.controlGap },
  sheetTitle: { ...typography.sheetTitle, marginBottom: spacing.controlGap },
  pickerItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.lg, paddingHorizontal: spacing.md,
  },
  pickerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.controlGap },
  pickerText: { ...typography.body },
});
