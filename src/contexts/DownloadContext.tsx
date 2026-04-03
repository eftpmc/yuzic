import React, {
  createContext,
  useContext,
  ReactNode,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  DownloadManager,
} from 'react-native-nitro-player';
import type { DownloadedTrack } from 'react-native-nitro-player';
import {
  DownloadProviderScope,
  doesTrackMatchProviderScope,
} from '@/utils/downloads/provider';
import { DownloadedCollectionEntry } from '@/utils/downloads/downloadStore';
import { Song } from '@/types';
import { useApi } from '@/api';
import { buildTrackItem } from '@/utils/builders/buildTrackItem';

type DownloadContextType = {
  configure: (config: Record<string, unknown>) => void;
  downloadTrack: (track: Song, playlistId?: string) => Promise<void>;
  downloadPlaylist: (playlistId: string, tracks: Song[]) => Promise<void>;
  pauseDownload: (downloadId: string) => Promise<void>;
  resumeDownload: (downloadId: string) => Promise<void>;
  cancelDownload: (downloadId: string) => Promise<void>;
  isTrackDownloaded: (trackId: string) => boolean;
  getAllDownloadedTracks: () => any[];
  deleteDownloadedTrack: (trackId: string) => Promise<void>;
  getStorageInfo: () => Promise<any>;
  setPlaybackSourcePreference: (pref: 'auto' | 'download' | 'network') => void;
  downloadAlbumById: (albumId: string) => Promise<void>;
  downloadPlaylistById: (playlistId: string) => Promise<void>;
  isTrackDownloading: (trackId: string) => boolean;
  getCollectionDownloadState: (trackIds: string[]) => {
    isDownloaded: boolean;
    isDownloading: boolean;
  };
  cancelCollectionDownloads: (collectionId: string) => Promise<void>;
  removeDownloadByCollectionId: (
    id: string,
    trackIds: string[],
    scope?: DownloadProviderScope
  ) => Promise<void>;
  cancelDownloadAll: () => Promise<void>;
  clearDownloadsForProvider: (scope?: DownloadProviderScope) => Promise<void>;
  clearAllDownloads: () => Promise<void>;
  downloadStateVersion: number;
  getLocalPath: (trackId: string) => string | null;
  getSongLocalUri: (songId: string) => Promise<string | null>;
  getAllDownloadedCollections: () => DownloadedCollectionEntry[];
  totalDownloadedBytes: number;
  downloadedTrackCount: number;
};

// Configure before any hook calls so getAllDownloadedTracks/Playlists don't
// race against an uninitialised native module on first mount.
DownloadManager.configure({
  maxConcurrentDownloads: 3,
  backgroundDownloadsEnabled: true,
  downloadArtwork: true,
});
DownloadManager.setPlaybackSourcePreference('auto');

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const useDownload = (): DownloadContextType => {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownload must be used within DownloadProvider');
  return ctx;
};

export const DownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const api = useApi();
  const isMountedRef = useRef(true);

  // Own state — avoids useDownloadedTracks which calls getAllDownloadedPlaylists()
  // (broken: requires PlaylistManager to know download collection IDs, which it never does)
  const [downloadedTracks, setDownloadedTracks] = useState<DownloadedTrack[]>([]);

  const refreshDownloads = useCallback(async () => {
    try {
      const tracks = await DownloadManager.getAllDownloadedTracks();
      if (isMountedRef.current) {
        setDownloadedTracks(tracks);
      }
    } catch {
      // silently ignore — state stays as-is
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    DownloadManager.syncDownloads().catch(() => {});
    refreshDownloads();

    // Re-fetch when a track finishes downloading
    DownloadManager.onDownloadComplete(() => {
      refreshDownloads();
    });

    // Also re-fetch on any state change to 'completed' (covers edge cases)
    DownloadManager.onDownloadStateChange((_downloadId, _trackId, state) => {
      if (state === 'completed') refreshDownloads();
    });

    return () => {
      isMountedRef.current = false;
    };
  }, [refreshDownloads]);

  // Reactive maps derived from downloadedTracks
  const trackMap = useMemo(
    () => new Map(downloadedTracks.map(t => [t.trackId, t])),
    [downloadedTracks]
  );

  const hookIsTrackDownloaded = useCallback(
    (trackId: string) => trackMap.has(trackId),
    [trackMap]
  );

  const hookGetDownloadedTrack = useCallback(
    (trackId: string) => trackMap.get(trackId),
    [trackMap]
  );

  // Build a sync trackId→localPath map so getLocalPath works without async
  const localPathMap = useMemo(() => {
    const map: Record<string, string> = {};
    downloadedTracks.forEach(t => { map[t.trackId] = t.localPath; });
    return map;
  }, [downloadedTracks]);

  // Reconstruct collection entries from track extraPayload — native
  // getAllDownloadedPlaylists() is unreliable because it requires PlaylistManager
  // to have registered the collection ID, which download paths never do.
  const getAllDownloadedCollections = useCallback((): DownloadedCollectionEntry[] => {
    const albumsById = new Map<string, { trackIds: string[]; downloadedAt: number }>();
    const playlistsById = new Map<string, { trackIds: string[]; downloadedAt: number }>();

    for (const dt of downloadedTracks) {
      const ep = dt.originalTrack?.extraPayload as any;

      const albumId = ep?.albumId;
      if (albumId) {
        const entry = albumsById.get(albumId) ?? { trackIds: [], downloadedAt: dt.downloadedAt };
        entry.trackIds.push(dt.trackId);
        if (dt.downloadedAt < entry.downloadedAt) entry.downloadedAt = dt.downloadedAt;
        albumsById.set(albumId, entry);
      }

      const playlistId = ep?.playlistId;
      if (playlistId) {
        const entry = playlistsById.get(playlistId) ?? { trackIds: [], downloadedAt: dt.downloadedAt };
        entry.trackIds.push(dt.trackId);
        if (dt.downloadedAt < entry.downloadedAt) entry.downloadedAt = dt.downloadedAt;
        playlistsById.set(playlistId, entry);
      }
    }

    const albumEntries = Array.from(albumsById.entries()).map(([id, { trackIds, downloadedAt }]) => ({
      id, type: 'album' as const, trackIds, downloadedAt,
    }));
    const playlistEntries = Array.from(playlistsById.entries()).map(([id, { trackIds, downloadedAt }]) => ({
      id, type: 'playlist' as const, trackIds, downloadedAt,
    }));

    return [...albumEntries, ...playlistEntries];
  }, [downloadedTracks]);

  const downloadTrack = useCallback(async (track: Song, playlistId?: string) => {
    await DownloadManager.downloadTrack(buildTrackItem(track), playlistId);
  }, []);

  const downloadPlaylistTracks = useCallback(async (playlistId: string, tracks: Song[]) => {
    await DownloadManager.downloadPlaylist(playlistId, tracks.map(buildTrackItem));
  }, []);

  const downloadAlbumById = useCallback(async (albumId: string) => {
    const album = await api.albums.get(albumId);
    const songs = album.songs ?? [];
    if (songs.length > 0) {
      await DownloadManager.downloadPlaylist(albumId, songs.map(buildTrackItem));
    }
  }, [api]);

  const downloadPlaylistById = useCallback(async (playlistId: string) => {
    const playlist = await api.playlists.get(playlistId);
    const songs = playlist.songs ?? [];
    if (songs.length > 0) {
      await DownloadManager.downloadPlaylist(playlistId, songs.map(song => buildTrackItem(song, playlistId)));
    }
  }, [api]);

  const deleteDownloadedTrack = useCallback(async (trackId: string) => {
    await DownloadManager.deleteDownloadedTrack(trackId);
    await refreshDownloads();
  }, [refreshDownloads]);

  const cancelDownload = useCallback(async (downloadId: string) => {
    await DownloadManager.cancelDownload(downloadId);
  }, []);

  const isTrackDownloading = useCallback((trackId: string) => {
    return DownloadManager.isDownloading(trackId);
  }, []);

  const getCollectionDownloadState = useCallback((trackIds: string[]) => {
    if (trackIds.length === 0) return { isDownloaded: false, isDownloading: false };
    return {
      isDownloaded: trackIds.every(id => hookIsTrackDownloaded(id)),
      isDownloading: trackIds.some(id => DownloadManager.isDownloading(id)),
    };
  }, [hookIsTrackDownloaded]);

  const cancelCollectionDownloads = useCallback(async (collectionId: string) => {
    const activeTasks = DownloadManager.getActiveDownloads();
    for (const task of activeTasks) {
      if (task.playlistId === collectionId) {
        await DownloadManager.cancelDownload(task.downloadId).catch(() => {});
      }
    }
  }, []);

  const removeDownloadByCollectionId = useCallback(async (
    id: string,
    trackIds: string[],
    scope?: DownloadProviderScope
  ) => {
    for (const trackId of trackIds) {
      const track = hookGetDownloadedTrack(trackId);
      if (scope && track && !doesTrackMatchProviderScope(track, scope)) continue;
      await DownloadManager.deleteDownloadedTrack(trackId).catch(() => {});
    }
    // Best-effort remove the playlist entry
    await DownloadManager.deleteDownloadedPlaylist(id).catch(() => {});
    await refreshDownloads();
  }, [hookGetDownloadedTrack, refreshDownloads]);

  const cancelDownloadAll = useCallback(async () => {
    await DownloadManager.cancelAllDownloads();
  }, []);

  const clearDownloadsForProvider = useCallback(async (scope?: DownloadProviderScope) => {
    const allTracks = await DownloadManager.getAllDownloadedTracks();
    for (const track of allTracks) {
      if (!scope || doesTrackMatchProviderScope(track, scope)) {
        await DownloadManager.deleteDownloadedTrack(track.trackId).catch(() => {});
      }
    }
    await refreshDownloads();
  }, [refreshDownloads]);

  const clearAllDownloads = useCallback(async () => {
    await DownloadManager.deleteAllDownloads();
    await refreshDownloads();
  }, [refreshDownloads]);

  const getSongLocalUri = useCallback(async (songId: string): Promise<string | null> => {
    return DownloadManager.getLocalPath(songId);
  }, []);

  const getLocalPath = useCallback((trackId: string): string | null => {
    return localPathMap[trackId] ?? null;
  }, [localPathMap]);

  const getAllDownloadedTracks = useCallback(() => downloadedTracks, [downloadedTracks]);

  const totalDownloadedBytes = downloadedTracks.reduce((sum, t) => sum + t.fileSize, 0);
  const downloadedTrackCount = downloadedTracks.length;

  const value: DownloadContextType = {
    configure: () => {},
    downloadTrack,
    downloadPlaylist: downloadPlaylistTracks,
    pauseDownload: async (id) => DownloadManager.pauseDownload(id),
    resumeDownload: async (id) => DownloadManager.resumeDownload(id),
    cancelDownload,
    isTrackDownloaded: hookIsTrackDownloaded,
    getAllDownloadedTracks,
    deleteDownloadedTrack,
    getStorageInfo: () => DownloadManager.getStorageInfo(),
    setPlaybackSourcePreference: (pref) => DownloadManager.setPlaybackSourcePreference(pref),
    downloadAlbumById,
    downloadPlaylistById,
    isTrackDownloading,
    getCollectionDownloadState,
    cancelCollectionDownloads,
    removeDownloadByCollectionId,
    cancelDownloadAll,
    clearDownloadsForProvider,
    clearAllDownloads,
    downloadStateVersion: downloadedTrackCount,
    getLocalPath,
    getSongLocalUri,
    getAllDownloadedCollections,
    totalDownloadedBytes,
    downloadedTrackCount,
  };

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  );
};
