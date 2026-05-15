import React, { useCallback, useEffect, useState } from 'react';
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
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useTheme } from '@/hooks/useTheme';
import { Paths } from 'expo-file-system';
import { formatBytes } from '@/utils/downloads/downloadStore';

const Downloads: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode, colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const router = useRouter();

  const {
    clearAllDownloads,
    totalDownloadedBytes,
    downloadedTrackCount,
    downloadStateVersion,
  } = useDownload();

  const [freeBytes, setFreeBytes] = useState<number | null>(null);

  useEffect(() => {
    setFreeBytes(Paths.availableDiskSpace);
  }, [downloadStateVersion]);

  const formattedSize = formatBytes(totalDownloadedBytes);
  const formattedAvailable = freeBytes != null ? formatBytes(freeBytes) : '—';
  const trackCount = downloadedTrackCount;

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
    <View style={[styles.section, { backgroundColor: colors.card }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
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
        <Text style={[styles.rowText, { color: colors.text }]}>
          {t('settings.library.downloads.sizeLabel')}
        </Text>
        <Text style={[styles.rowValue, { color: colors.subtext }]}>
          {formattedSize}
        </Text>
      </View>

      <View style={styles.row}>
        <Text style={[styles.rowText, { color: colors.text }]}>
          {t('settings.library.downloads.availableLabel', { defaultValue: 'Available Space' })}
        </Text>
        <Text style={[styles.rowValue, { color: colors.subtext }]}>
          {formattedAvailable}
        </Text>
      </View>

      {trackCount > 0 && (
        <Text style={[styles.note, { color: colors.subtext }]}>
          {t('settings.library.downloads.offlineNote')}
        </Text>
      )}

      <TouchableOpacity
        style={styles.moreInfoRow}
        onPress={() => router.push('/settings/downloadsInfoView')}
      >
        <Text style={[styles.rowText, { color: colors.text }]}>
          {t('settings.library.downloads.moreInfo')}
        </Text>
        <MaterialIcons
          name="chevron-right"
          size={22}
          color={colors.subtext}
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
    borderRadius: 12,
    overflow: 'hidden',
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
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowText: {
    fontSize: 16,
  },
  rowValue: {
    fontSize: 14,
  },
  note: {
    marginTop: 10,
    fontSize: 12,
  },
  moreInfoRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
});
