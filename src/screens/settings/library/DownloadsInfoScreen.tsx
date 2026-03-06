import React, { useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import {
  DownloadManager,
  useDownloadProgress,
  useDownloadedTracks,
  useDownloadStorage,
} from 'react-native-nitro-player';

import Header from '../components/Header';
import { useTheme } from '@/hooks/useTheme';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { useAlbums } from '@/hooks/albums';
import { useFullPlaylists, usePlaylists } from '@/hooks/playlists';
import { MediaImage } from '@/components/MediaImage';
import { useDownload } from '@/contexts/DownloadContext';
import {
  DownloadProviderType,
  getDownloadedTrackServerId,
  getDownloadedTrackServerType,
  inferServerTypeFromCoverKind,
} from '@/utils/downloads/provider';

type DownloadRow = {
  id: string;
  collectionId: string;
  type: 'album' | 'playlist';
  provider: DownloadProviderType;
  serverId: string | null;
  cover: any;
  title: string;
  subtitle: string;
  trackIds: string[];
  downloaded: string;
  size: string;
  updatedAt: number;
};

const ESTIMATED_ROW_HEIGHT = 108;

function toBytesLabel(value: unknown): string {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) return '-';

  if (value < 1024) return `${Math.round(value)} B`;

  const units = ['KB', 'MB', 'GB', 'TB'];
  let next = value / 1024;
  let unitIdx = 0;
  while (next >= 1024 && unitIdx < units.length - 1) {
    next /= 1024;
    unitIdx += 1;
  }

  return `${next.toFixed(next >= 100 ? 0 : next >= 10 ? 1 : 2)} ${units[unitIdx]}`;
}

function toTimestamp(value: unknown): number {
  const ts = typeof value === 'number' ? value : Date.parse(String(value ?? ''));
  return Number.isFinite(ts) ? ts : 0;
}

const DownloadsInfoScreen: React.FC = () => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const activeServer = useSelector(selectActiveServer);
  const { removeDownloadByCollectionId, clearDownloadsForProvider } = useDownload();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const { albums = [] } = useAlbums();
  const { playlists = [] } = usePlaylists();
  const { playlists: fullPlaylists = [] } = useFullPlaylists(playlists);
  const { storageInfo, formattedSize, formattedAvailable } = useDownloadStorage();
  const { progressList } = useDownloadProgress({ activeOnly: false });
  const downloadedState = useDownloadedTracks() as any;

  const downloadedTracks = (downloadedState?.downloadedTracks ?? []) as any[];
  const downloadedPlaylists = (downloadedState?.downloadedPlaylists ?? []) as any[];

  const rows = useMemo(() => {
    const downloadedTrackIds = new Set<string>();
    const downloadedAlbumIds = new Set<string>();
    const downloadedBytesByTrackId = new Map<string, number>();
    const downloadedBytesByAlbumId = new Map<string, number>();
    for (const track of downloadedTracks) {
      const trackId = String(track?.trackId ?? track?.originalTrack?.id ?? '');
      const albumId = String(track?.originalTrack?.extraPayload?.albumId ?? '');
      const fileSize = Number(track?.fileSize ?? 0);
      if (trackId) downloadedTrackIds.add(trackId);
      if (albumId) downloadedAlbumIds.add(albumId);
      if (trackId && fileSize > 0) downloadedBytesByTrackId.set(trackId, fileSize);
      if (albumId && fileSize > 0) {
        downloadedBytesByAlbumId.set(
          albumId,
          Number(downloadedBytesByAlbumId.get(albumId) ?? 0) + fileSize
        );
      }
    }

    const downloadedPlaylistIds = new Set<string>();
    const downloadedBytesByPlaylistId = new Map<string, number>();
    for (const playlist of fullPlaylists) {
      let playlistDownloadedBytes = 0;
      const hasDownloadedSong = playlist.songs.some(song => {
        const isDownloaded = downloadedTrackIds.has(song.id);
        if (isDownloaded) {
          playlistDownloadedBytes += Number(downloadedBytesByTrackId.get(song.id) ?? 0);
        }
        return isDownloaded;
      });
      if (hasDownloadedSong) downloadedPlaylistIds.add(playlist.id);
      if (playlistDownloadedBytes > 0) {
        downloadedBytesByPlaylistId.set(playlist.id, playlistDownloadedBytes);
      }
    }

    const downloadedMap = new Map<string, any>();
    for (const item of downloadedPlaylists) {
      downloadedMap.set(String(item.playlistId), item);
    }

    const progressByCollectionId = new Map<string, any>();
    for (const progress of progressList as any[]) {
      const task = DownloadManager.getDownloadTask(progress.downloadId) as any;
      const collectionId = String(task?.playlistId ?? '');
      if (!collectionId) continue;

      const existing = progressByCollectionId.get(collectionId);
      const progressPct = Number(progress?.progress ?? 0);
      if (!existing || progressPct > Number(existing.progress?.progress ?? 0)) {
        progressByCollectionId.set(collectionId, { progress, task });
      }
    }

    const allItems = [
      ...albums.map(item => ({ ...item, type: 'album' as const })),
      ...playlists.map(item => ({ ...item, type: 'playlist' as const })),
    ];

    const allItemIds = new Set(allItems.map(item => String(item.id)));
    const fallbackItems = [
      ...Array.from(downloadedMap.keys()),
      ...Array.from(progressByCollectionId.keys()),
    ]
      .filter(id => !allItemIds.has(id))
      .map(id => ({
        id,
        type: 'playlist' as const,
        title: id,
        cover: { kind: 'none' as const },
      }));

    const filtered = allItems.filter(item => {
      const id = String(item.id);
      const hasProgress = progressByCollectionId.has(id);
      const hasCollectionState = downloadedMap.has(id);

      if (item.type === 'album') {
        return downloadedAlbumIds.has(id) || hasProgress || hasCollectionState;
      }

      return downloadedPlaylistIds.has(id) || hasProgress || hasCollectionState;
    });

    const filteredFallback = fallbackItems.filter(item => {
      const id = String(item.id);
      return downloadedMap.has(id) || progressByCollectionId.has(id);
    });

    const normalized: DownloadRow[] = [...filtered, ...filteredFallback].map(item => {
      const id = String(item.id);
      const downloaded = downloadedMap.get(id);
      const progressBundle = progressByCollectionId.get(id);
      const progress = progressBundle?.progress;
      const task = progressBundle?.task;

      const isDownloading = !!progress;

      const downloadedBytes = isDownloading
        ? progress?.bytesDownloaded
        : item.type === 'album'
          ? downloadedBytesByAlbumId.get(id) ??
            downloaded?.totalSize ??
            downloaded?.downloadedTracks?.reduce((sum: number, track: any) => {
              return sum + Number(track?.fileSize ?? 0);
            }, 0)
          : downloadedBytesByPlaylistId.get(id) ??
            downloaded?.totalSize ??
            downloaded?.downloadedTracks?.reduce((sum: number, track: any) => {
              return sum + Number(track?.fileSize ?? 0);
            }, 0);

      const totalBytes = progress?.totalBytes ?? downloaded?.totalSize ?? downloadedBytes;

      const updatedAtRaw =
        task?.completedAt ??
        task?.startedAt ??
        task?.createdAt ??
        downloaded?.downloadedAt;

      const downloadedTrackIdsForCollection = item.type === 'album'
        ? downloadedTracks
            .filter(track => String(track?.originalTrack?.extraPayload?.albumId ?? '') === id)
            .map(track => String(track?.trackId ?? track?.originalTrack?.id ?? ''))
            .filter(Boolean)
        : (
            fullPlaylists.find(playlist => playlist.id === id)?.songs
              .map(song => song.id)
              .filter(songId => downloadedTrackIds.has(songId)) ??
            (downloaded?.downloadedTracks ?? [])
              .map((track: any) => String(track?.trackId ?? track?.originalTrack?.id ?? ''))
              .filter(Boolean)
          );

      const downloadTracksForRow = item.type === 'album'
        ? downloadedTracks.filter(track => String(track?.originalTrack?.extraPayload?.albumId ?? '') === id)
        : (downloaded?.downloadedTracks ?? []);

      const provider: DownloadProviderType = (
        getDownloadedTrackServerType(downloadTracksForRow[0]) ??
        inferServerTypeFromCoverKind(item?.cover?.kind) ??
        null
      ) ?? 'unknown';
      const serverId = getDownloadedTrackServerId(downloadTracksForRow[0]);

      const title = item.title || task?.playlistTitle || task?.playlistId || id;

      return {
        id: `${provider}-${serverId ?? 'unknown'}-${item.type}-${id}`,
        collectionId: id,
        type: item.type,
        provider,
        serverId,
        cover: item.cover ?? { kind: 'none' },
        title,
        subtitle:
          item.type === 'album'
            ? t('settings.library.downloads.type.album')
            : t('settings.library.downloads.type.playlist'),
        trackIds: downloadedTrackIdsForCollection,
        downloaded: toBytesLabel(downloadedBytes),
        size: toBytesLabel(totalBytes),
        updatedAt: toTimestamp(updatedAtRaw),
      };
    });

    const providerRank: Record<DownloadProviderType, number> = {
      navidrome: 0,
      jellyfin: 1,
      unknown: 2,
    };

    return normalized.sort((a, b) => {
      const byProvider = providerRank[a.provider] - providerRank[b.provider];
      if (byProvider !== 0) return byProvider;
      return b.updatedAt - a.updatedAt;
    });
  }, [albums, playlists, fullPlaylists, downloadedTracks, downloadedPlaylists, progressList, t]);

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
            {String(storageInfo?.trackCount ?? downloadedTracks.length)}
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
        estimatedItemSize={ESTIMATED_ROW_HEIGHT}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  summaryCard: {
    margin: 16,
    marginBottom: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryCardDark: {
    backgroundColor: '#111',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    color: '#000',
    fontSize: 14,
  },
  summaryLabelDark: {
    color: '#fff',
  },
  summaryValue: {
    color: '#555',
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValueDark: {
    color: '#aaa',
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  tableHeaderDark: {
    backgroundColor: '#1C1C1E',
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
  },
  providerHeaderDark: {
    backgroundColor: '#1C1C1E',
  },
  providerHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4b5563',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  providerHeaderTextDark: {
    color: '#d1d5db',
  },
  providerHeaderDelete: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerItem: {
    fontSize: 11,
    fontWeight: '700',
    color: '#666',
    textTransform: 'uppercase',
  },
  headerTrack: {
    flex: 1.9,
  },
  headerBytes: {
    width: 78,
    textAlign: 'right',
  },
  headerAction: {
    width: 34,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    padding: 10,
    gap: 6,
  },
  rowDark: {
    backgroundColor: '#111',
    borderColor: '#2C2C2E',
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 8,
    overflow: 'hidden',
  },
  coverCell: {
    width: 44,
  },
  trackCell: {
    flex: 1.9,
    paddingRight: 4,
  },
  title: {
    color: '#111',
    fontSize: 14,
    fontWeight: '600',
  },
  titleDark: {
    color: '#fff',
  },
  subtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  subtitleDark: {
    color: '#aaa',
  },
  bytesCell: {
    width: 78,
    color: '#333',
    fontSize: 12,
    textAlign: 'right',
  },
  removeButton: {
    width: 34,
    height: 26,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  removeButtonDisabled: {
    opacity: 0.45,
  },
  valueDark: {
    color: '#ddd',
  },
  separator: {
    height: 8,
  },
  emptyText: {
    paddingTop: 20,
    textAlign: 'center',
    color: '#666',
    fontSize: 13,
  },
  emptyTextDark: {
    color: '#999',
  },
});
