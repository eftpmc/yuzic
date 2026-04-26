import { TFunction } from 'i18next';
import {
  DownloadProviderType,
  getDownloadedTrackServerId,
  getDownloadedTrackServerType,
  inferServerTypeFromCoverKind,
} from '@/utils/downloads/provider';
import {
  buildDownloadedTrackIdSet,
} from '@/utils/downloads/collectionState';
import { DownloadedCollectionEntry } from '@/utils/downloads/downloadStore';
import { DownloadRow } from './types';

type BuildDownloadRowsArgs = {
  albums: any[];
  tracks: any[];
  playlists: any[];
  fullPlaylists: any[];
  downloadedTracks: any[];
  downloadedCollections: DownloadedCollectionEntry[];
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
  downloadedCollections,
  t,
}: BuildDownloadRowsArgs): DownloadRow[] {
  const downloadedTrackIds = buildDownloadedTrackIdSet(
    downloadedTracks
      .map(track => ({
        id: String(track?.trackId ?? track?.originalTrack?.id ?? ''),
      }))
      .filter(track => track.id)
  );

  // fileSize keyed by trackId — used to sum bytes for each collection
  const downloadedBytesByTrackId = new Map<string, number>();
  for (const track of downloadedTracks) {
    const trackId = String(track?.trackId ?? track?.originalTrack?.id ?? '');
    const fileSize = Number(track?.fileSize ?? 0);
    if (trackId) downloadedBytesByTrackId.set(trackId, fileSize);
  }

  // Build a unified lookup map for both album and playlist collection entries
  const downloadedMap = new Map<string, DownloadedCollectionEntry>();
  for (const col of downloadedCollections) {
    downloadedMap.set(String(col.id), col);
  }

  const allItems = [
    ...albums.map(item => ({ ...item, type: 'album' as const })),
    ...playlists.map(item => ({ ...item, type: 'playlist' as const })),
  ];

  const filtered = allItems.filter(item => downloadedMap.has(String(item.id)));

  const normalized: DownloadRow[] = filtered.map(item => {
    const id = String(item.id);
    const downloaded = downloadedMap.get(id);
    // Sum bytes using the collection's stored trackIds — avoids albumId mapping issues
    const downloadedBytes = (downloaded?.trackIds ?? []).reduce(
      (sum, tid) => sum + (downloadedBytesByTrackId.get(tid) ?? 0),
      0
    );
    const updatedAtRaw = downloaded?.downloadedAt;

    const downloadedTrackIdsForCollection =
      item.type === 'album'
        ? (() => {
            const fromLibraryTracks = tracks
              .filter(track => String(track?.albumId ?? '') === id)
              .map(track => String(track?.id ?? '').trim())
              .filter((trackId: string) => Boolean(trackId) && downloadedTrackIds.has(trackId));
            if (fromLibraryTracks.length) return fromLibraryTracks;
            return downloadedTracks
              .filter(track => String(track?.albumId ?? track?.originalTrack?.extraPayload?.albumId ?? '') === id)
              .map(track => String(track?.trackId ?? track?.originalTrack?.id ?? ''))
              .filter(Boolean);
          })()
        : (
            fullPlaylists.find((playlist: any) => String(playlist.id) === id)?.songs
              .map((song: any) => String(song.id ?? '').trim())
              .filter((songId: string) => Boolean(songId) && downloadedTrackIds.has(songId)) ??
            (downloaded?.trackIds ?? []).filter((id: string) => downloadedTrackIds.has(id))
          );

    const downloadTracksForRow =
      item.type === 'album'
        ? downloadedTracks.filter(track => String(track?.albumId ?? track?.originalTrack?.extraPayload?.albumId ?? '') === id)
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
      size: toBytesLabel(downloadedBytes),
      updatedAt: toTimestamp(updatedAtRaw),
    };
  });

  const providerRank: Record<DownloadProviderType, number> = {
    navidrome: 0,
    jellyfin: 1,
    emby: 2,
    unknown: 3,
  };

  return normalized.sort((a, b) => {
    const byProvider = providerRank[a.provider] - providerRank[b.provider];
    if (byProvider !== 0) return byProvider;
    return b.updatedAt - a.updatedAt;
  });
}

