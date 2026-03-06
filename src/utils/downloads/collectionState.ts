type TrackIdLike = {
  id: string;
};

type AlbumTrackLike = {
  id: string;
  albumId?: string | null;
};

type PlaylistLike = {
  id: string;
  songs: TrackIdLike[];
};

export function buildDownloadedTrackIdSet(
  tracks: TrackIdLike[]
): Set<string> {
  return new Set(
    tracks
      .map(track => String(track.id))
      .filter(Boolean)
  );
}

export function areTrackIdsFullyDownloaded(
  trackIds: string[],
  downloadedTrackIds: Set<string>
): boolean {
  if (!trackIds.length) return false;
  return trackIds.every(id => downloadedTrackIds.has(id));
}

export function isPlaylistFullyDownloaded(
  playlist: PlaylistLike,
  downloadedTrackIds: Set<string>
): boolean {
  const trackIds = playlist.songs
    .map(song => String(song.id))
    .filter(Boolean);
  return areTrackIdsFullyDownloaded(trackIds, downloadedTrackIds);
}

export function getFullyDownloadedAlbumIds(
  tracks: AlbumTrackLike[],
  downloadedTrackIds: Set<string>
): Set<string> {
  const totalsByAlbumId = new Map<string, number>();
  const downloadedByAlbumId = new Map<string, number>();

  for (const track of tracks) {
    const albumId = String(track.albumId ?? '');
    const trackId = String(track.id ?? '');
    if (!albumId || !trackId) continue;

    totalsByAlbumId.set(albumId, (totalsByAlbumId.get(albumId) ?? 0) + 1);
    if (downloadedTrackIds.has(trackId)) {
      downloadedByAlbumId.set(
        albumId,
        (downloadedByAlbumId.get(albumId) ?? 0) + 1
      );
    }
  }

  const fullyDownloadedAlbumIds = new Set<string>();
  for (const [albumId, total] of totalsByAlbumId.entries()) {
    if (total > 0 && (downloadedByAlbumId.get(albumId) ?? 0) === total) {
      fullyDownloadedAlbumIds.add(albumId);
    }
  }

  return fullyDownloadedAlbumIds;
}
