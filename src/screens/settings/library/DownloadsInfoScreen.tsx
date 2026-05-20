import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { Trash2 } from 'lucide-react-native';
import Header from '../components/Header';
import { useTheme } from '@/hooks/useTheme';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useAlbums } from '@/hooks/albums';
import { usePlaylists } from '@/hooks/playlists';
import { useTracks } from '@/hooks/tracks';
import { MediaImage } from '@/components/MediaImage';
import { useDownload } from '@/contexts/DownloadContext';
import { DownloadRow } from './downloadsInfo/types';
import { buildDownloadRows } from './downloadsInfo/buildRows';
import { Paths } from 'expo-file-system';
import { formatBytes } from '@/utils/downloads/downloadStore';
import SettingsCard from '../components/SettingsCard';
import SettingsDivider from '../components/SettingsDivider';
import SettingsInfoRow from '../components/SettingsInfoRow';

const DownloadsInfoScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
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
    () => buildDownloadRows({ albums, tracks, playlists: fullPlaylists, fullPlaylists, downloadedTracks, downloadedCollections, t }),
    [albums, tracks, fullPlaylists, downloadedTracks, downloadedCollections, t]
  );

  const downloadedAlbumCount = useMemo(() => rows.filter(r => r.type === 'album').length, [rows]);
  const downloadedPlaylistCount = useMemo(() => rows.filter(r => r.type === 'playlist').length, [rows]);

  const confirmRemove = useCallback((row: DownloadRow) => {
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
              Alert.alert(t('settings.library.downloads.removeFailedTitle'), t('settings.library.downloads.removeFailedBody'));
            } finally {
              setRemovingId(null);
            }
          },
        },
      ]
    );
  }, [t, removeDownloadByCollectionId]);

  const confirmClearProvider = useCallback((row: DownloadRow) => {
    const providerLabel =
      row.provider === 'navidrome' ? t('settings.library.downloads.provider.navidrome') :
      row.provider === 'jellyfin' ? t('settings.library.downloads.provider.jellyfin') :
      row.provider === 'emby' ? t('settings.library.downloads.provider.emby') :
      t('settings.library.downloads.provider.unknown');

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
              Alert.alert(t('settings.library.downloads.clearFailedTitle'), t('settings.library.downloads.clearFailedBody'));
            }
          },
        },
      ]
    );
  }, [t, clearDownloadsForProvider, activeServer?.type, activeServer?.id]);

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t('settings.library.downloads.detailsTitle')} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        <SettingsCard>
          <SettingsInfoRow label={t('settings.library.downloads.sizeLabel')} value={formattedSize} stacked />
          <SettingsDivider />
          <SettingsInfoRow label={t('settings.library.downloads.availableLabel', { defaultValue: 'Available Space' })} value={formattedAvailable} stacked />
          <SettingsDivider />
          <SettingsInfoRow label={t('settings.library.downloads.table.playlists')} value={String(downloadedPlaylistCount)} stacked />
          <SettingsDivider />
          <SettingsInfoRow label={t('settings.library.downloads.type.album')} value={String(downloadedAlbumCount)} stacked />
          <SettingsDivider />
          <SettingsInfoRow label={t('settings.library.downloads.table.tracks')} value={String(downloadedTrackCount)} stacked />
        </SettingsCard>

        {rows.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t('settings.library.downloads.table.empty')}
          </Text>
        ) : (
          rows.map((item, index) => {
            const prev = index > 0 ? rows[index - 1] : null;
            const showSectionHeader = !prev || prev.provider !== item.provider;
            const sectionTitle =
              item.provider === 'navidrome' ? t('settings.library.downloads.provider.navidrome') :
              item.provider === 'jellyfin' ? t('settings.library.downloads.provider.jellyfin') :
              item.provider === 'emby' ? t('settings.library.downloads.provider.emby') :
              t('settings.library.downloads.provider.unknown');

            return (
              <View key={item.id}>
                {showSectionHeader && (
                  <View style={styles.providerHeader}>
                    <Text style={[styles.providerTitle, { color: colors.secondary }]}>{sectionTitle}</Text>
                    <TouchableOpacity onPress={() => confirmClearProvider(item)} style={styles.providerDelete}>
                      <Trash2 size={16} color={colors.subtext} />
                    </TouchableOpacity>
                  </View>
                )}
                <View style={[styles.row, { backgroundColor: colors.card }]}>
                  <View style={styles.coverCell}>
                    <MediaImage cover={item.cover} size="thumb" style={styles.cover} />
                  </View>
                  <View style={styles.trackCell}>
                    <View style={styles.titleLine}>
                      <Text numberOfLines={1} style={[styles.title, { color: colors.secondary }]}>{item.title}</Text>
                      <Text numberOfLines={1} style={[styles.sizeText, { color: colors.subtext }]}>{item.size}</Text>
                    </View>
                    <View style={styles.metaLine}>
                      <Text numberOfLines={1} style={[styles.meta, { color: colors.subtext }]}>{item.subtitle}</Text>
                      <Text style={[styles.metaDot, { color: colors.subtext }]}>·</Text>
                      <Text numberOfLines={1} style={[styles.meta, { color: colors.subtext }]}>
                        {item.trackCount} {item.trackCount === 1 ? t('common.song') : t('common.songs')}
                      </Text>
                      <Text style={[styles.metaDot, { color: colors.subtext }]}>·</Text>
                      <Text numberOfLines={1} style={[styles.meta, styles.shrink, { color: colors.subtext }]}>{item.downloaded}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={[styles.removeButton, removingId === item.id && styles.disabled]}
                    onPress={() => confirmRemove(item)}
                    disabled={removingId === item.id}
                  >
                    <Trash2 size={16} color={colors.subtext} />
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  emptyText: {
    paddingTop: 20,
    textAlign: 'center',
    fontSize: 13,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  providerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  providerDelete: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  coverCell: {
    width: 44,
    marginRight: 12,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
  },
  trackCell: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  sizeText: {
    fontSize: 12,
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  meta: { fontSize: 12 },
  metaDot: {
    fontSize: 12,
    marginHorizontal: 4,
  },
  shrink: { flexShrink: 1 },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
});
