import React, { forwardRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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

interface LanguageBottomSheetProps {
  selected: string;
  onSelect: (code: string) => void;
}

const LanguageBottomSheet = forwardRef<
  BottomSheetModal,
  LanguageBottomSheetProps
>(({ selected, onSelect }, ref) => {
  const themeColor = useSelector(selectThemeColor);
  const { isDarkMode, colors } = useTheme();
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
            <TouchableOpacity
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
                  style={{ marginRight: 10 }}
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
            </TouchableOpacity>
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
