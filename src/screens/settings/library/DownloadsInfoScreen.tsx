import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import Header from '../components/Header';
import { useTheme } from '@/hooks/useTheme';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useAlbums } from '@/hooks/albums';
import { useFullPlaylists, usePlaylists } from '@/hooks/playlists';
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
  const { isDarkMode } = useTheme();
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
  const { playlists = [] } = usePlaylists();
  const { playlists: fullPlaylists = [] } = useFullPlaylists(playlists);
  const { tracks = [] } = useTracks();

  useEffect(() => {
    setFreeBytes(Paths.availableDiskSpace);
  }, [downloadStateVersion]);

  const downloadedTracks = useMemo(() => getAllDownloadedTracks(), [getAllDownloadedTracks, downloadStateVersion]);
  const downloadedCollections = useMemo(() => getAllDownloadedCollections(), [getAllDownloadedCollections, downloadStateVersion]);

  const formattedSize = formatBytes(totalDownloadedBytes);
  const formattedAvailable = freeBytes != null ? formatBytes(freeBytes) : '—';

  const downloadedPlaylists = useMemo(
    () => downloadedCollections
      .filter(c => c.type === 'playlist')
      .map(c => ({ playlistId: c.id, downloadedAt: c.downloadedAt })),
    [downloadedCollections]
  );

  const rows = useMemo(
    () =>
      buildDownloadRows({
        albums,
        tracks,
        playlists,
        fullPlaylists,
        downloadedTracks,
        downloadedPlaylists,
        t,
      }),
    [albums, tracks, playlists, fullPlaylists, downloadedTracks, downloadedPlaylists, downloadStateVersion, t]
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
        isDarkMode && styles.containerDark,
        Platform.OS === 'android' && { paddingTop: 24 },
      ]}
    >
      <Header title={t('settings.library.downloads.detailsTitle')} />

      <View style={[styles.summaryCard, isDarkMode && styles.summaryCardDark]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, isDarkMode && styles.summaryLabelDark]}>
            {t('settings.library.downloads.sizeLabel')}
          </Text>
          <Text style={[styles.summaryValue, isDarkMode && styles.summaryValueDark]}>
            {formattedSize}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, isDarkMode && styles.summaryLabelDark]}>
            {t('settings.library.downloads.availableLabel')}
          </Text>
          <Text style={[styles.summaryValue, isDarkMode && styles.summaryValueDark]}>
            {formattedAvailable}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, isDarkMode && styles.summaryLabelDark]}>
            {t('settings.library.downloads.table.playlists')}
          </Text>
          <Text style={[styles.summaryValue, isDarkMode && styles.summaryValueDark]}>
            {String(downloadedPlaylistCount)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, isDarkMode && styles.summaryLabelDark]}>
            {t('settings.library.downloads.type.album')}
          </Text>
          <Text style={[styles.summaryValue, isDarkMode && styles.summaryValueDark]}>
            {String(downloadedAlbumCount)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, isDarkMode && styles.summaryLabelDark]}>
            {t('settings.library.downloads.table.tracks')}
          </Text>
          <Text style={[styles.summaryValue, isDarkMode && styles.summaryValueDark]}>
            {String(downloadedTrackCount)}
          </Text>
        </View>
      </View>

      <View style={[styles.tableHeader, isDarkMode && styles.tableHeaderDark]}>
        <Text numberOfLines={1} style={[styles.headerItem, styles.headerTrack]}>
          {t('settings.library.downloads.table.item')}
        </Text>
        <Text numberOfLines={1} style={[styles.headerItem, styles.headerBytes]}>
          {t('settings.library.downloads.table.downloaded')}
        </Text>
        <Text numberOfLines={1} style={[styles.headerItem, styles.headerBytes]}>
          {t('settings.library.downloads.table.size')}
        </Text>
        <View style={styles.headerAction} />
      </View>

      <FlashList
        data={rows}
        keyExtractor={(item) => item.id}
        removeClippedSubviews={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
            {t('settings.library.downloads.table.empty')}
          </Text>
        }
        renderItem={({ item, index }) => {
          const prev = index > 0 ? rows[index - 1] : null;
          const showSectionHeader = !prev || prev.provider !== item.provider;
          const sectionTitle =
            item.provider === 'navidrome'
              ? t('settings.library.downloads.provider.navidrome')
              : item.provider === 'jellyfin'
                ? t('settings.library.downloads.provider.jellyfin')
                : t('settings.library.downloads.provider.unknown');

          return (
            <View>
              {showSectionHeader && (
                <View style={[styles.providerHeader, isDarkMode && styles.providerHeaderDark]}>
                  <Text style={[styles.providerHeaderText, isDarkMode && styles.providerHeaderTextDark]}>
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

              <View style={[styles.row, isDarkMode && styles.rowDark]}>
                <View style={styles.coverCell}>
                  <MediaImage cover={item.cover} size="thumb" style={styles.cover} />
                </View>
                <View style={styles.trackCell}>
                  <Text
                    numberOfLines={1}
                    style={[styles.title, isDarkMode && styles.titleDark]}
                  >
                    {item.title}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.subtitle, isDarkMode && styles.subtitleDark]}
                  >
                    {item.subtitle}
                  </Text>
                </View>
                <Text numberOfLines={1} style={[styles.bytesCell, isDarkMode && styles.valueDark]}>
                  {item.downloaded}
                </Text>
                <Text numberOfLines={1} style={[styles.bytesCell, isDarkMode && styles.valueDark]}>
                  {item.size}
                </Text>
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
        }}
      />
    </SafeAreaView>
  );
};

export default DownloadsInfoScreen;
