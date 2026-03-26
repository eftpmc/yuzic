import React, { useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import { selectLanguage } from '@/utils/redux/selectors/settingsSelectors';
import { setLanguage } from '@/utils/redux/slices/settingsSlice';
import { getLanguageByCode } from '@/constants/languages';
import { useTranslation } from 'react-i18next';
import LanguageBottomSheet from './LanguageBottomSheet';

export const LanguageSelector: React.FC = () => {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const selected = useSelector(selectLanguage);
  const { t } = useTranslation();
  const bottomSheetRef = useRef<BottomSheetModal>(null);

  const selectedLang = getLanguageByCode(selected);
  const selectedLabel = selectedLang?.nativeName ?? selected;

  const handleOpen = useCallback(() => {
    bottomSheetRef.current?.present();
  }, []);

  const handleSelect = useCallback(
    (code: string) => {
      dispatch(setLanguage(code));
      bottomSheetRef.current?.dismiss();
    },
    [dispatch],
  );

  return (
    <>
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.row}>
          <View style={styles.textColumn}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('settings.appearance.language.title')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.subtext }]}>
              {t('settings.appearance.language.subtitle')}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleOpen}
            style={[
              styles.dropdown,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.dropdownText, { color: colors.text }]}>
              {selectedLabel}
            </Text>
            <Ionicons
              name="chevron-down"
              size={16}
              color={colors.subtext}
              style={styles.dropdownIcon}
            />
          </TouchableOpacity>
        </View>
      </View>

      <LanguageBottomSheet
        ref={bottomSheetRef}
        selected={selected}
        onSelect={handleSelect}
      />
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textColumn: {
    flex: 1,
    paddingRight: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 100,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownIcon: {
    marginLeft: 6,
  },
});
