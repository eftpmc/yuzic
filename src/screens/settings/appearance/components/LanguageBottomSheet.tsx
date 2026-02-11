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
import { AVAILABLE_LANGUAGES } from '@/constants/languages';
import { useTranslation } from 'react-i18next';

interface LanguageBottomSheetProps {
  selected: string;
  onSelect: (code: string) => void;
}

const LanguageBottomSheet = forwardRef<
  BottomSheetModal,
  LanguageBottomSheetProps
>(({ selected, onSelect }, ref) => {
  const themeColor = useSelector(selectThemeColor);
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();

  const snapPoints = useMemo(() => ['35%'], []);

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
                <Ionicons
                  name="language-outline"
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
                  {lang.nativeName}
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

export default LanguageBottomSheet;

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
