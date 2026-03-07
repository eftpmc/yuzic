import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Check, X } from 'lucide-react-native';
import {
  selectOfflineModeEnabled,
  selectThemeColor,
} from '@/utils/redux/selectors/settingsSelectors';
import { setOfflineModeEnabled } from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';

const OfflineMode: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const offlineModeEnabled = useSelector(selectOfflineModeEnabled);

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
        {t('settings.library.offlineMode.title')}
      </Text>
      <Text style={[styles.infoText, isDarkMode && styles.infoTextDark]}>
        {t('settings.library.offlineMode.info')}
      </Text>

      <View style={styles.row}>
        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
          {t('settings.library.offlineMode.toggle')}
        </Text>
        <View style={styles.toggleGrid}>
          <TouchableOpacity
            onPress={() => dispatch(setOfflineModeEnabled(false))}
            style={[
              styles.gridButton,
              isDarkMode && styles.gridButtonDark,
              !offlineModeEnabled && {
                backgroundColor: themeColor,
                borderColor: themeColor,
              },
            ]}
            activeOpacity={0.8}
          >
            <X
              size={18}
              color={
                !offlineModeEnabled
                  ? '#fff'
                  : isDarkMode
                    ? '#ccc'
                    : '#666'
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => dispatch(setOfflineModeEnabled(true))}
            style={[
              styles.gridButton,
              styles.gridButtonSpaced,
              isDarkMode && styles.gridButtonDark,
              offlineModeEnabled && {
                backgroundColor: themeColor,
                borderColor: themeColor,
              },
            ]}
            activeOpacity={0.8}
          >
            <Check
              size={18}
              color={
                offlineModeEnabled
                  ? '#fff'
                  : isDarkMode
                    ? '#ccc'
                    : '#666'
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default OfflineMode;

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#fff',
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 10,
  },
  sectionTitleDark: {
    color: '#fff',
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    marginBottom: 12,
  },
  infoTextDark: {
    color: '#aaa',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowText: {
    fontSize: 16,
    color: '#1C1C1E',
    flex: 1,
    marginRight: 12,
  },
  rowTextDark: {
    color: '#fff',
  },
  toggleGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f1f1',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  gridButtonDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  gridButtonSpaced: {
    marginLeft: 8,
  },
});
