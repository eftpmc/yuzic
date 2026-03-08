import React, { useMemo, useCallback } from 'react';
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
import { useAlbums } from '@/hooks/albums';
import { usePlaylists } from '@/hooks/playlists';
import { MediaImage } from '@/components/MediaImage';

const Downloads: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const router = useRouter();
  const { albums = [] } = useAlbums();
  const { playlists = [] } = usePlaylists();

  const {
    clearAllDownloads,
    cancelCollectionDownloads,
    getCollectionDownloadState,
    downloadStateVersion,
  } = useDownload();

  const { storageInfo, formattedSize, formattedAvailable } = useDownloadStorage();

  const trackCount = storageInfo?.trackCount ?? 0;

  const items = useMemo(() => {
    const collectionItems = [
      ...albums.map(a => ({ ...a, type: 'album' as const })),
      ...playlists.map(p => ({ ...p, type: 'playlist' as const })),
    ];

    return collectionItems
      .map((item) => {
        const trackIds = (item.songs ?? []).map((song: any) => String(song?.id ?? '')).filter(Boolean);
        const state = getCollectionDownloadState(trackIds);
        if (!state.isDownloaded && !state.isDownloading) return null;
        return {
          ...item,
          trackIds,
          isDownloaded: state.isDownloaded,
          isDownloading: state.isDownloading,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      title: string;
      cover?: any;
      type: 'album' | 'playlist';
      trackIds: string[];
      isDownloaded: boolean;
      isDownloading: boolean;
    }>;
  }, [albums, playlists, getCollectionDownloadState, downloadStateVersion]);

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

      <View style={styles.list}>
        {items.map(item => {
          const status = item.isDownloaded
            ? { label: t('settings.library.downloads.status.downloaded'), color: '#22c55e' }
            : item.isDownloading
              ? { label: t('settings.library.downloads.status.downloading'), color: themeColor }
              : { label: t('settings.library.downloads.status.incomplete'), color: '#f97316' };

          return (
            <View
              key={item.id}
              style={[styles.card, isDarkMode && styles.cardDark]}
            >
              <MediaImage
                cover={item.cover ?? { kind: 'none' }}
                size="thumb"
                style={styles.downloadCover}
              />

              <View style={styles.cardInfo}>
                <Text style={[styles.cardTitle, isDarkMode && styles.cardTitleDark]}>
                  {item.title}
                </Text>
                <Text style={[styles.cardSub, isDarkMode && styles.cardSubDark]}>
                  {item.type === 'album' ? t('settings.library.downloads.type.album') : t('settings.library.downloads.type.playlist')}
                </Text>
              </View>

              <View style={styles.cardActions}>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: `${status.color}22`,
                      borderColor: status.color,
                    },
                  ]}
                >
                  <Text style={{ color: status.color, fontSize: 12, fontWeight: '600' }}>
                    {status.label}
                  </Text>
                </View>

                {item.isDownloading && (
                  <TouchableOpacity onPress={() => cancelCollectionDownloads(item.id)}>
                    <MaterialIcons name="cancel" size={18} color={status.color} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
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
  downloadCover: {
    width: 48,
    height: 48,
    borderRadius: 6,
    overflow: 'hidden',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    marginTop: 8,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f7f7f7',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cardDark: {
    backgroundColor: '#1a1a1a',
    borderColor: '#333',
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cardTitle: {
    fontSize: 14,
    color: '#444',
  },
  cardTitleDark: {
    color: '#ccc',
  },
  cardSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  cardSubDark: {
    color: '#aaa',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
