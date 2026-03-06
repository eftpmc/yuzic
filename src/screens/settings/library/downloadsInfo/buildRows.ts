import { TFunction } from 'i18next';
import { DownloadManager } from 'react-native-nitro-player';
import {
  DownloadProviderType,
  getDownloadedTrackServerId,
  getDownloadedTrackServerType,
  inferServerTypeFromCoverKind,
} from '@/utils/downloads/provider';
import { DownloadRow } from './types';

type BuildDownloadRowsArgs = {
  albums: any[];
  playlists: any[];
  fullPlaylists: any[];
  downloadedTracks: any[];
  downloadedPlaylists: any[];
  progressList: any[];
  t: TFunction;
};

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

export function buildDownloadRows({
  albums,
  playlists,
  fullPlaylists,
  downloadedTracks,
  downloadedPlaylists,
  progressList,
  t,
}: BuildDownloadRowsArgs): DownloadRow[] {
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
    const hasDownloadedSong = playlist.songs.some((song: any) => {
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
  for (const progress of progressList) {
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
  const fallbackAlbumItems = Array.from(downloadedAlbumIds)
    .filter(id => !allItemIds.has(id))
    .map(id => {
      const sampleTrack = downloadedTracks.find(
        track => String(track?.originalTrack?.extraPayload?.albumId ?? '') === id
      );
      const title =
        String(
          sampleTrack?.originalTrack?.album ??
          sampleTrack?.originalTrack?.extraPayload?.album ??
          ''
        ).trim() || id;

      return {
        id,
        type: 'album' as const,
        title,
        cover: { kind: 'none' as const },
      };
    });

  const fallbackPlaylistItems = [
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

  const fallbackItems = [...fallbackAlbumItems, ...fallbackPlaylistItems];

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

    const downloadedTrackIdsForCollection =
      item.type === 'album'
        ? downloadedTracks
            .filter(track => String(track?.originalTrack?.extraPayload?.albumId ?? '') === id)
            .map(track => String(track?.trackId ?? track?.originalTrack?.id ?? ''))
            .filter(Boolean)
        : (
            fullPlaylists.find((playlist: any) => playlist.id === id)?.songs
              .map((song: any) => song.id)
              .filter((songId: string) => downloadedTrackIds.has(songId)) ??
            (downloaded?.downloadedTracks ?? [])
              .map((track: any) => String(track?.trackId ?? track?.originalTrack?.id ?? ''))
              .filter(Boolean)
          );

    const downloadTracksForRow =
      item.type === 'album'
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
}

