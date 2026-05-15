import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import { useTheme } from '@/hooks/useTheme';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useAlbums } from '@/hooks/albums';
import { usePlaylists } from '@/hooks/playlists';
import { useTracks } from '@/hooks/tracks';
import { MediaImage } from '@/components/MediaImage';
import { useDownload } from '@/contexts/DownloadContext';
import { DownloadRow } from './downloadsInfo/types';
import { buildDownloadRows } from './downloadsInfo/buildRows';
import { styles } from './downloadsInfo/styles';
import { Paths } from 'expo-file-system';
import { formatBytes } from '@/utils/downloads/downloadStore';

const DownloadsInfoScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode, colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const activeServer = useSelector(selectActiveServer);
  const {
    removeDownloadByCollectionId,
    clearDownloadsForProvider,
    downloadStateVersion,
    getAllDownloadedTracks,
    getAllDownloadedCollections,
    totalDownloadedBytes,
    downloadedTrackCount,
  } = useDownload();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [freeBytes, setFreeBytes] = useState<number | null>(null);
  const { albums = [] } = useAlbums();
  const { playlists: fullPlaylists = [] } = usePlaylists();
  const { tracks = [] } = useTracks();

  useEffect(() => {
    setFreeBytes(Paths.availableDiskSpace);
  }, [downloadStateVersion]);

  const downloadedTracks = useMemo(() => getAllDownloadedTracks(), [getAllDownloadedTracks]);
  const downloadedCollections = useMemo(() => getAllDownloadedCollections(), [getAllDownloadedCollections]);

  const formattedSize = formatBytes(totalDownloadedBytes);
  const formattedAvailable = freeBytes != null ? formatBytes(freeBytes) : '—';

  const rows = useMemo(
    () =>
      buildDownloadRows({
        albums,
        tracks,
        playlists: fullPlaylists,
        fullPlaylists,
        downloadedTracks,
        downloadedCollections,
        t,
      }),
    [albums, tracks, fullPlaylists, downloadedTracks, downloadedCollections, t]
  );

  const downloadedAlbumCount = useMemo(
    () => rows.filter(item => item.type === 'album').length,
    [rows]
  );

  const downloadedPlaylistCount = useMemo(
    () => rows.filter(item => item.type === 'playlist').length,
    [rows]
  );

  const confirmRemove = (row: DownloadRow) => {
    Alert.alert(
      t('settings.library.downloads.removeTitle'),
      t('settings.library.downloads.removeBody', { title: row.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setRemovingId(row.id);
              await removeDownloadByCollectionId(row.collectionId, row.trackIds, {
                serverId: row.serverId,
                serverType: row.provider === 'unknown' ? null : row.provider,
              });
            } catch {
              Alert.alert(
                t('settings.library.downloads.removeFailedTitle'),
                t('settings.library.downloads.removeFailedBody')
              );
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  };

  const confirmClearProvider = (row: DownloadRow) => {
    const providerLabel =
      row.provider === 'navidrome'
        ? t('settings.library.downloads.provider.navidrome')
        : row.provider === 'jellyfin'
          ? t('settings.library.downloads.provider.jellyfin')
          : row.provider === 'emby'
            ? t('settings.library.downloads.provider.emby')
            : t('settings.library.downloads.provider.unknown');

    Alert.alert(
      t('settings.library.downloads.clearTitle'),
      t('settings.library.downloads.clearBodyProviderNamed', { provider: providerLabel }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await clearDownloadsForProvider({
                serverId: row.serverId ?? (row.provider === activeServer?.type ? activeServer?.id : null),
                serverType: row.provider === 'unknown' ? null : row.provider,
              });
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
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background },
        Platform.OS === 'android' && { paddingTop: 24 },
      ]}
    >
      <Header title={t('settings.library.downloads.detailsTitle')} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text }]}>
              {t('settings.library.downloads.sizeLabel')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.subtext }]}>
              {formattedSize}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text }]}>
              {t('settings.library.downloads.availableLabel')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.subtext }]}>
              {formattedAvailable}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text }]}>
              {t('settings.library.downloads.table.playlists')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.subtext }]}>
              {String(downloadedPlaylistCount)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text }]}>
              {t('settings.library.downloads.type.album')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.subtext }]}>
              {String(downloadedAlbumCount)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: colors.text }]}>
              {t('settings.library.downloads.table.tracks')}
            </Text>
            <Text style={[styles.summaryValue, { color: colors.subtext }]}>
              {String(downloadedTrackCount)}
            </Text>
          </View>
        </View>

        {rows.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t('settings.library.downloads.table.empty')}
          </Text>
        ) : (
          rows.map((item, index) => {
            const prev = index > 0 ? rows[index - 1] : null;
            const showSectionHeader = !prev || prev.provider !== item.provider;
            const sectionTitle =
              item.provider === 'navidrome'
                ? t('settings.library.downloads.provider.navidrome')
                : item.provider === 'jellyfin'
                  ? t('settings.library.downloads.provider.jellyfin')
                  : item.provider === 'emby'
                    ? t('settings.library.downloads.provider.emby')
                    : t('settings.library.downloads.provider.unknown');

            return (
              <View key={item.id}>
                {showSectionHeader && (
                  <View style={styles.providerHeader}>
                    <Text style={[styles.providerHeaderText, { color: colors.text }]}>
                      {sectionTitle}
                    </Text>
                    <TouchableOpacity
                      onPress={() => confirmClearProvider(item)}
                      style={styles.providerHeaderDelete}
                    >
                      <MaterialIcons name="delete-outline" size={16} color={themeColor} />
                    </TouchableOpacity>
                  </View>
                )}

                <View style={[styles.row, { backgroundColor: colors.card }]}>
                  <View style={styles.coverCell}>
                    <MediaImage cover={item.cover} size="thumb" style={styles.cover} />
                  </View>
                  <View style={styles.trackCell}>
                    <View style={styles.titleLine}>
                      <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
                        {item.title}
                      </Text>
                      <Text numberOfLines={1} style={[styles.sizeText, { color: colors.text }]}>
                        {item.size}
                      </Text>
                    </View>
                    <View style={styles.metaLine}>
                      <Text numberOfLines={1} style={[styles.subtitle, { color: colors.subtext }]}>
                        {item.subtitle}
                      </Text>
                      <Text style={[styles.metaDot, { color: colors.subtext }]}>•</Text>
                      <Text numberOfLines={1} style={[styles.subtitle, { color: colors.subtext }]}>
                        {item.trackCount} {item.trackCount === 1 ? t('common.song') : t('common.songs')}
                      </Text>
                      <Text style={[styles.metaDot, { color: colors.subtext }]}>•</Text>
                      <Text numberOfLines={1} style={[styles.subtitle, styles.downloadedDate, { color: colors.subtext }]}>
                        {item.downloaded}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.removeButton, removingId === item.id && styles.removeButtonDisabled]}
                    onPress={() => confirmRemove(item)}
                    disabled={removingId === item.id}
                  >
                    <MaterialIcons name="delete-outline" size={18} color={themeColor} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default DownloadsInfoScreen;
