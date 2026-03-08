import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useDownload } from '@/contexts/DownloadContext';
import {
  useDownloadStorage,
} from 'react-native-nitro-player';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';

const Downloads: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const router = useRouter();

  const {
    clearAllDownloads,
  } = useDownload();

  const { storageInfo, formattedSize, formattedAvailable } = useDownloadStorage();

  const trackCount = storageInfo?.trackCount ?? 0;

  const handleClearDownloads = useCallback(() => {
    Alert.alert(
      t('settings.library.downloads.clearTitle'),
      t('settings.library.downloads.clearBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearAllDownloads();
            } catch {
              Alert.alert(
                t('settings.library.downloads.clearFailedTitle'),
                t('settings.library.downloads.clearFailedBody')
              );
            }
          },
        },
      ]
    );
  }, [clearAllDownloads, t]);

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          {t('settings.library.downloads.title')}
        </Text>

        <TouchableOpacity
          onPress={handleClearDownloads}
          disabled={trackCount === 0}
          style={[
            styles.iconButton,
            {
              backgroundColor: themeColor,
              opacity: trackCount === 0 ? 0.5 : 1,
            },
          ]}
        >
          <MaterialIcons name="delete" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
          {t('settings.library.downloads.sizeLabel')}
        </Text>
        <Text style={[styles.rowValue, isDarkMode && styles.rowValueDark]}>
          {formattedSize}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
          {t('settings.library.downloads.availableLabel', { defaultValue: 'Available Space' })}
        </Text>
        <Text style={[styles.rowValue, isDarkMode && styles.rowValueDark]}>
          {formattedAvailable}
        </Text>
      </View>

      {trackCount > 0 && (
        <Text style={[styles.note, isDarkMode && styles.noteDark]}>
          {t('settings.library.downloads.offlineNote')}
        </Text>
      )}

      <TouchableOpacity
        style={styles.moreInfoRow}
        onPress={() => router.push('/settings/downloadsInfoView')}
      >
        <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
          {t('settings.library.downloads.moreInfo')}
        </Text>
        <MaterialIcons
          name="chevron-right"
          size={22}
          color={isDarkMode ? '#fff' : '#6E6E73'}
        />
      </TouchableOpacity>
    </View>
  );
};

export default Downloads;

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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  sectionTitleDark: {
    color: '#fff',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  rowText: {
    fontSize: 16,
    color: '#000',
  },
  rowTextDark: {
    color: '#fff',
  },
  rowValue: {
    fontSize: 14,
    color: '#666',
  },
  rowValueDark: {
    color: '#aaa',
  },
  note: {
    marginTop: 10,
    fontSize: 12,
    color: '#888',
  },
  noteDark: {
    color: '#aaa',
  },
  moreInfoRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});
