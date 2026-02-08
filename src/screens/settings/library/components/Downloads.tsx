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
import { useDownload } from '@/contexts/DownloadContext';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import { useAlbums } from '@/hooks/albums';
import { usePlaylists } from '@/hooks/playlists';

const Downloads: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const { albums = [] } = useAlbums();
  const { playlists = [] } = usePlaylists();


  const {
    getDownloadedSongsCount,
    clearAllDownloads,
    isAlbumDownloaded,
    isPlaylistDownloaded,
    isDownloadingAlbum,
    isDownloadingPlaylist,
    cancelDownload,
    getFormattedDownloadSize,
    markedAlbums,
    markedPlaylists,
  } = useDownload();

  const downloadedSongCount = getDownloadedSongsCount();

  const items = useMemo(() => {
    const albumItems = albums
      .filter(a => markedAlbums.includes(a.id))
      .map(a => ({ ...a, type: 'album' as const }));

    const playlistItems = playlists
      .filter(p => markedPlaylists.includes(p.id))
      .map(p => ({ ...p, type: 'playlist' as const }));

    return [...albumItems, ...playlistItems];
  }, [albums, playlists, markedAlbums, markedPlaylists]);

  const handleClearDownloads = useCallback(() => {
    Alert.alert(
      t('settings.library.downloads.clearTitle'),
      t('settings.library.downloads.clearBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.delete'), style: 'destructive', onPress: clearAllDownloads },
      ]
    );
  }, [clearAllDownloads]);

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
          {t('settings.library.downloads.title')}
        </Text>

        <TouchableOpacity
          onPress={handleClearDownloads}
          disabled={downloadedSongCount === 0}
          style={[
            styles.iconButton,
            {
              backgroundColor: themeColor,
              opacity: downloadedSongCount === 0 ? 0.5 : 1,
            },
          ]}
        >
          <MaterialIcons name="delete" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.list}>
        {items.map(item => {
          const downloaded =
            item.type === 'album'
              ? isAlbumDownloaded(item.id)
              : isPlaylistDownloaded(item.id);

          const downloading =
            item.type === 'album'
              ? isDownloadingAlbum(item.id)
              : isDownloadingPlaylist(item.id);

          const status = downloaded
            ? { label: t('settings.library.downloads.status.downloaded'), color: '#22c55e' }
            : downloading
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

                {downloading && (
                  <TouchableOpacity onPress={() => cancelDownload(item.id)}>
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
          {getFormattedDownloadSize()}
        </Text>
      </View>

      {downloadedSongCount > 0 && (
        <Text style={[styles.note, isDarkMode && styles.noteDark]}>
          {t('settings.library.downloads.offlineNote')}
        </Text>
      )}
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
});