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
import type { DownloadedTrack } from '@/contexts/DownloadContext';
import { AlbumBase } from '@/types/Album';
import { SongBase } from '@/types/Song';
import { PlaylistBase } from '@/types/Playlist';
import type { Song } from '@/types/Song';
import { DownloadRow } from './types';

type BuildDownloadRowsArgs = {
  albums: AlbumBase[];
  tracks: SongBase[];
  playlists: PlaylistBase[];
  fullPlaylists: (PlaylistBase & { songs?: Song[] })[];
  downloadedTracks: DownloadedTrack[];
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

function toDateLabel(value: number): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
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
              .filter(track => String(track.albumId ?? '') === id)
              .map(track => track.trackId)
              .filter(Boolean);
          })()
        : (() => {
            const playlistSongs = fullPlaylists.find(playlist => String(playlist.id) === id)?.songs;
            const fromPlaylist = Array.isArray(playlistSongs) ? playlistSongs
              .map(song => String(song.id ?? '').trim())
              .filter(songId => Boolean(songId) && downloadedTrackIds.has(songId)) : [];
            if (fromPlaylist.length) return fromPlaylist;
            return (downloaded?.trackIds ?? []).filter((id: string) => downloadedTrackIds.has(id));
          })();

    const downloadTracksForRow =
      item.type === 'album'
        ? downloadedTracks.filter(track => downloadedTrackIdsForCollection.includes(track.trackId))
        : downloadedTracks.filter(track => downloadedTrackIdsForCollection.includes(String(track?.trackId ?? track?.originalTrack?.id ?? '')));

    const firstTrack = downloadTracksForRow[0];
    const provider: DownloadProviderType = (
      (firstTrack ? getDownloadedTrackServerType(firstTrack) : null) ??
      inferServerTypeFromCoverKind(item?.cover?.kind) ??
      null
    ) ?? 'unknown';
    const serverId = firstTrack ? getDownloadedTrackServerId(firstTrack) : null;
    const title = item.title || id;
    const updatedAt = toTimestamp(updatedAtRaw);

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
      downloaded: toDateLabel(updatedAt),
      size: toBytesLabel(downloadedBytes),
      trackCount: downloadedTrackIdsForCollection.length,
      updatedAt,
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
