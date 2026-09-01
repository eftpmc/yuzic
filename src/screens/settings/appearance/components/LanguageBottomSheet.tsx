import React, { forwardRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Languages, Check } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';

import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import { AVAILABLE_LANGUAGES } from '@/constants/languages';
import { useTranslation } from 'react-i18next';
import { renderBackdrop } from '@/components/BottomSheetBackdrop';
import Touchable from '@/components/Touchable';
import { radius, spacing, typography } from '@/constants/design';

interface LanguageBottomSheetProps {
  selected: string;
  onSelect: (code: string) => void;
}

const LanguageBottomSheet = forwardRef<
  BottomSheetModal,
  LanguageBottomSheetProps
>(({ selected, onSelect }, ref) => {
  const themeColor = useSelector(selectThemeColor);
  const { colors } = useTheme();
  const { t } = useTranslation();

  const snapPoints = useMemo(() => ['35%'], []);

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.card,
      }}
      handleIndicatorStyle={{
        backgroundColor: colors.border,
      }}
    >
      <BottomSheetView style={styles.sheetContainer}>
        <Text
          style={[styles.sheetTitle, { color: colors.secondary }]}
        >
          {t('settings.appearance.language.title')}
        </Text>

        {AVAILABLE_LANGUAGES.map(lang => {
          const isSelected = selected === lang.code;

          return (
            <Touchable
              key={lang.code}
              style={[
                styles.pickerItem,
                {
                  backgroundColor: isSelected
                    ? themeColor + '22'
                    : 'transparent',
                },
              ]}
              onPress={() => onSelect(lang.code)}
            >
              <View style={styles.pickerLeft}>
                <Languages
                  size={18}
                  color={isSelected ? themeColor : colors.subtext}
                  style={{ marginRight: spacing.controlGap }}
                />
                <Text
                  style={[
                    styles.pickerText,
                    { color: colors.secondary, fontWeight: isSelected ? '600' : '400' },
                  ]}
                >
                  {t(lang.translationKey)}
                </Text>
              </View>

              {isSelected && (
                <Check
                  size={20}
                  color={themeColor}
                />
              )}
            </Touchable>
          );
        })}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

LanguageBottomSheet.displayName = 'LanguageBottomSheet';

export default LanguageBottomSheet;

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
