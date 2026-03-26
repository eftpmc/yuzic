import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as FileSystem from 'expo-file-system/legacy';
import {
  DownloadProviderScope,
  doesTrackMatchProviderScope,
} from '@/utils/downloads/provider';
import {
  DownloadedCollectionEntry,
  DownloadedTrackEntry,
  normalizeId,
} from '@/utils/downloads/downloadStore';
import {
  trackDownloaded,
  trackRemoved,
  staleTracksRemoved,
  collectionAdded,
  collectionRemoved,
  collectionsUpdated,
  pendingAdded,
  pendingRemoved,
  allCleared,
} from '@/utils/redux/slices/downloadsSlice';
import type { RootState } from '@/utils/redux/store';
import { Song } from '@/types';
import { useApi } from '@/api';

const SONGS_DIR = `${FileSystem.documentDirectory}yuzic-downloads`;
const getTrackPath = (trackId: string) => `${SONGS_DIR}/${trackId}.mp3`;
const getTmpPath = (trackId: string) => `${SONGS_DIR}/${trackId}.tmp`;

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

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const useDownload = (): DownloadContextType => {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownload must be used within DownloadProvider');
  return ctx;
};

export const DownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const api = useApi();
  const dispatch = useDispatch();

  const tracks = useSelector((state: RootState) => state.downloads.tracks);
  const collections = useSelector((state: RootState) => state.downloads.collections);
  const pending = useSelector((state: RootState) => state.downloads.pending);

  const tracksRef = useRef(tracks);
  const collectionsRef = useRef(collections);
  const pendingRef = useRef(pending);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  useEffect(() => { collectionsRef.current = collections; }, [collections]);
  useEffect(() => { pendingRef.current = pending; }, [pending]);

  // Pre-populate from persisted Redux tracks so getLocalPath works immediately on mount,
  // before the async filesystem scan completes.
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(
    () => new Set(Object.keys(tracks))
  );
  const downloadedIdsRef = useRef(downloadedIds);
  useEffect(() => { downloadedIdsRef.current = downloadedIds; }, [downloadedIds]);

  const activeDownloadsRef = useRef<Map<string, any>>(new Map());
  const [, setProgressTick] = useState(0);

  // On startup: scan filesystem — source of truth for what files exist
  useEffect(() => {
    const init = async () => {
      await FileSystem.makeDirectoryAsync(SONGS_DIR, { intermediates: true }).catch(() => {});

      const files = await FileSystem.readDirectoryAsync(SONGS_DIR).catch(() => [] as string[]);
      const presentIds = new Set(
        files.filter(f => f.endsWith('.mp3')).map(f => f.replace('.mp3', ''))
      );

      setDownloadedIds(presentIds);

      // Remove Redux entries whose files no longer exist
      const staleIds = Object.keys(tracksRef.current).filter(id => !presentIds.has(id));
      if (staleIds.length > 0) dispatch(staleTracksRemoved(staleIds));

      // Resume interrupted downloads
      for (const entry of Object.values(pendingRef.current)) {
        if (presentIds.has(entry.trackId)) {
          dispatch(pendingRemoved(entry.trackId));
          continue;
        }
        const partialSong: Song = {
          id: entry.trackId,
          streamUrl: entry.streamUrl,
          albumId: entry.albumId ?? '',
          artistId: entry.artistId ?? '',
          sourceServerId: entry.serverId,
          sourceServerType: entry.serverType as any,
          cover: { kind: (entry.coverKind ?? 'none') as any },
          title: '',
          artist: '',
          duration: '',
        };
        downloadSong(partialSong, entry.collectionId).catch(() => {});
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadSong = useCallback(async (song: Song, _collectionId?: string) => {
    const trackId = normalizeId(song.id);

    if (downloadedIdsRef.current.has(trackId)) return;
    if (activeDownloadsRef.current.has(trackId)) return;

    if (!pendingRef.current[trackId]) {
      dispatch(pendingAdded({
        id: trackId,
        entry: {
          trackId,
          streamUrl: song.streamUrl,
          albumId: song.albumId,
          artistId: song.artistId,
          serverId: song.sourceServerId,
          serverType: song.sourceServerType,
          coverKind: song.cover?.kind,
          collectionId: _collectionId,
          requestedAt: Date.now(),
        },
      }));
    }

    const tmpPath = getTmpPath(trackId);
    const finalPath = getTrackPath(trackId);

    const progressCb = ({ totalBytesWritten, totalBytesExpectedToWrite }: any) => {
      const pct = totalBytesExpectedToWrite > 0
        ? totalBytesWritten / totalBytesExpectedToWrite
        : 0;
      activeDownloadsRef.current.set(trackId, { ...activeDownloadsRef.current.get(trackId), pct });
      setProgressTick(n => n + 1);
    };

    const task = FileSystem.createDownloadResumable(song.streamUrl, tmpPath, {}, progressCb);
    activeDownloadsRef.current.set(trackId, task);

    try {
      const result = await task.downloadAsync();
      if (!result || result.status !== 200) return;

      const tmpInfo = await FileSystem.getInfoAsync(tmpPath);
      if (!tmpInfo.exists) return;

      await FileSystem.moveAsync({ from: tmpPath, to: finalPath });

      const finalInfo = await FileSystem.getInfoAsync(finalPath);
      if (!finalInfo.exists) return;

      const entry: DownloadedTrackEntry = {
        trackId,
        fileSize: (finalInfo as any).size ?? 0,
        downloadedAt: Date.now(),
        albumId: song.albumId ?? '',
        artistId: song.artistId ?? '',
        serverId: song.sourceServerId ?? '',
        serverType: song.sourceServerType ?? '',
        coverKind: song.cover?.kind ?? 'none',
      };

      dispatch(trackDownloaded(entry));
      dispatch(pendingRemoved(trackId));
      setDownloadedIds(prev => new Set([...prev, trackId]));
    } catch (err) {
      console.warn('[DownloadContext] Download error', err);
    } finally {
      FileSystem.deleteAsync(tmpPath, { idempotent: true }).catch(() => {});
      activeDownloadsRef.current.delete(trackId);
      setProgressTick(n => n + 1);
    }
  }, [dispatch]);

  const downloadAlbumById = useCallback(async (albumId: string) => {
    const album = await api.albums.get(albumId);
    const songs = album.songs ?? [];
    for (const song of songs) await downloadSong(song, albumId);
    dispatch(collectionAdded({
      id: albumId,
      type: 'album',
      trackIds: songs.map(s => s.id),
      downloadedAt: Date.now(),
    }));
  }, [api, downloadSong, dispatch]);

  const downloadPlaylistById = useCallback(async (playlistId: string) => {
    const playlist = await api.playlists.get(playlistId);
    const songs = playlist.songs ?? [];
    for (const song of songs) await downloadSong(song, playlistId);
    dispatch(collectionAdded({
      id: playlistId,
      type: 'playlist',
      trackIds: songs.map(s => s.id),
      downloadedAt: Date.now(),
    }));
  }, [api, downloadSong, dispatch]);

  const isTrackDownloaded = useCallback(
    (id: string) => downloadedIds.has(normalizeId(id)),
    [downloadedIds]
  );

  const isTrackDownloading = (id: string) =>
    activeDownloadsRef.current.has(normalizeId(id));

  const getLocalPath = useCallback(
    (id: string) => {
      const nid = normalizeId(id);
      return downloadedIds.has(nid) ? getTrackPath(nid) : null;
    },
    [downloadedIds]
  );

  const getSongLocalUri = useCallback(async (id: string): Promise<string | null> => {
    const path = getTrackPath(normalizeId(id));
    const info = await FileSystem.getInfoAsync(path);
    return info.exists ? path : null;
  }, []);

  const deleteDownloadedTrack = useCallback(async (trackId: string) => {
    await FileSystem.deleteAsync(getTrackPath(trackId), { idempotent: true }).catch(() => {});
    dispatch(trackRemoved(trackId));
    setDownloadedIds(prev => {
      const next = new Set(prev);
      next.delete(trackId);
      return next;
    });
  }, [dispatch]);

  const cancelDownload = useCallback(async (id: string) => {
    const task = activeDownloadsRef.current.get(id);
    if (task?.cancelAsync) {
      await task.cancelAsync().catch(() => {});
      activeDownloadsRef.current.delete(id);
    }
    dispatch(pendingRemoved(id));
  }, [dispatch]);

  const removeDownloadByCollectionId = useCallback(async (
    id: string,
    trackIds: string[],
    scope?: DownloadProviderScope
  ) => {
    for (const trackId of trackIds) {
      const entry = tracksRef.current[trackId];
      if (!entry) continue;
      if (scope && !doesTrackMatchProviderScope(entry, scope)) continue;
      await deleteDownloadedTrack(trackId);
    }
    dispatch(collectionRemoved(id));
  }, [deleteDownloadedTrack, dispatch]);

  const getCollectionDownloadState = useCallback((trackIds: string[]) => {
    if (trackIds.length === 0) return { isDownloaded: false, isDownloading: false };
    return {
      isDownloaded: trackIds.every(id => downloadedIdsRef.current.has(normalizeId(id))),
      isDownloading: trackIds.some(id => activeDownloadsRef.current.has(normalizeId(id))),
    };
  }, []);

  const cancelCollectionDownloads = useCallback(async (collectionId: string) => {
    const col = collectionsRef.current[collectionId];
    if (!col) return;
    for (const trackId of col.trackIds) await cancelDownload(trackId);
  }, [cancelDownload]);

  const cancelDownloadAll = useCallback(async () => {
    for (const [, task] of activeDownloadsRef.current) {
      if (task?.cancelAsync) await task.cancelAsync().catch(() => {});
    }
    activeDownloadsRef.current.clear();
  }, []);

  const clearDownloadsForProvider = useCallback(async (scope?: DownloadProviderScope) => {
    const tracksToDelete = Object.values(tracksRef.current).filter(
      entry => !scope || doesTrackMatchProviderScope(entry, scope)
    );
    for (const entry of tracksToDelete) await deleteDownloadedTrack(entry.trackId);

    const deletedIds = new Set(tracksToDelete.map(e => e.trackId));
    const remaining: Record<string, DownloadedCollectionEntry> = {};
    for (const [colId, col] of Object.entries(collectionsRef.current)) {
      const kept = col.trackIds.filter(id => !deletedIds.has(id));
      if (kept.length > 0) remaining[colId] = { ...col, trackIds: kept };
    }
    dispatch(collectionsUpdated(remaining));
  }, [deleteDownloadedTrack, dispatch]);

  const clearAllDownloads = useCallback(async () => {
    await cancelDownloadAll();
    await FileSystem.deleteAsync(SONGS_DIR, { idempotent: true }).catch(() => {});
    await FileSystem.makeDirectoryAsync(SONGS_DIR, { intermediates: true }).catch(() => {});
    dispatch(allCleared());
    setDownloadedIds(new Set());
  }, [cancelDownloadAll, dispatch]);

  const totalDownloadedBytes = Object.values(tracks).reduce((sum, t) => sum + t.fileSize, 0);
  const downloadedTrackCount = downloadedIds.size;

  const value: DownloadContextType = {
    configure: () => {},
    downloadTrack: downloadSong,
    downloadPlaylist: async (playlistId, trackList) => {
      for (const t of trackList) await downloadSong(t, playlistId);
    },
    pauseDownload: async () => {},
    resumeDownload: async () => {},
    cancelDownload,
    isTrackDownloaded,
    getAllDownloadedTracks: () => Object.values(tracks),
    deleteDownloadedTrack,
    getStorageInfo: async () => null,
    setPlaybackSourcePreference: () => {},
    downloadAlbumById,
    downloadPlaylistById,
    isTrackDownloading,
    getCollectionDownloadState,
    cancelCollectionDownloads,
    removeDownloadByCollectionId,
    cancelDownloadAll,
    clearDownloadsForProvider,
    clearAllDownloads,
    downloadStateVersion: downloadedIds.size + Object.keys(pending).length,
    getLocalPath,
    getSongLocalUri,
    getAllDownloadedCollections: () => Object.values(collections),
    totalDownloadedBytes,
    downloadedTrackCount,
  };

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  );
};
