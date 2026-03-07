import { TFunction } from 'i18next';
import {
  DownloadProviderType,
  getDownloadedTrackServerId,
  getDownloadedTrackServerType,
  inferServerTypeFromCoverKind,
} from '@/utils/downloads/provider';
import {
  buildDownloadedTrackIdSet,
  getFullyDownloadedAlbumIds,
  isPlaylistFullyDownloaded,
} from '@/utils/downloads/collectionState';
import { DownloadRow } from './types';

type BuildDownloadRowsArgs = {
  albums: any[];
  tracks: any[];
  playlists: any[];
  fullPlaylists: any[];
  downloadedTracks: any[];
  downloadedPlaylists: any[];
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
  tracks,
  playlists,
  fullPlaylists,
  downloadedTracks,
  downloadedPlaylists,
  t,
}: BuildDownloadRowsArgs): DownloadRow[] {
  const downloadedTrackIds = buildDownloadedTrackIdSet(
    downloadedTracks
      .map(track => ({
        id: String(track?.trackId ?? track?.originalTrack?.id ?? ''),
      }))
      .filter(track => track.id)
  );
  const downloadedAlbumIds = getFullyDownloadedAlbumIds(
    tracks.map(track => ({
      id: String(track?.id ?? ''),
      albumId: String(track?.albumId ?? ''),
    })),
    downloadedTrackIds
  );
  const downloadedBytesByTrackId = new Map<string, number>();
  const downloadedBytesByAlbumId = new Map<string, number>();

  for (const track of downloadedTracks) {
    const trackId = String(track?.trackId ?? track?.originalTrack?.id ?? '');
    const albumId = String(track?.originalTrack?.extraPayload?.albumId ?? '');
    const fileSize = Number(track?.fileSize ?? 0);
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
    if (!isPlaylistFullyDownloaded(playlist, downloadedTrackIds)) continue;
    downloadedPlaylistIds.add(playlist.id);
    const playlistDownloadedBytes = playlist.songs.reduce((sum: number, song: any) => {
      return sum + Number(downloadedBytesByTrackId.get(song.id) ?? 0);
    }, 0);
    if (playlistDownloadedBytes > 0) {
      downloadedBytesByPlaylistId.set(String(playlist.id), playlistDownloadedBytes);
    }
  }

  const downloadedMap = new Map<string, any>();
  for (const item of downloadedPlaylists) {
    downloadedMap.set(String(item.playlistId), item);
  }

  const allItems = [
    ...albums.map(item => ({ ...item, type: 'album' as const })),
    ...playlists.map(item => ({ ...item, type: 'playlist' as const })),
  ];

  const filtered = allItems.filter(item => {
    const id = String(item.id);

    if (item.type === 'album') {
      return downloadedAlbumIds.has(id);
    }

    return downloadedPlaylistIds.has(id);
  });

  const normalized: DownloadRow[] = filtered.map(item => {
    const id = String(item.id);
    const downloaded = downloadedMap.get(id);
    const downloadedBytes = item.type === 'album'
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

    const totalBytes = downloaded?.totalSize ?? downloadedBytes;
    const updatedAtRaw = downloaded?.downloadedAt;

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
        : downloadedTracks.filter(track => downloadedTrackIdsForCollection.includes(String(track?.trackId ?? track?.originalTrack?.id ?? '')));

    const provider: DownloadProviderType = (
      getDownloadedTrackServerType(downloadTracksForRow[0]) ??
      inferServerTypeFromCoverKind(item?.cover?.kind) ??
      null
    ) ?? 'unknown';
    const serverId = getDownloadedTrackServerId(downloadTracksForRow[0]);
    const title = item.title || id;

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

