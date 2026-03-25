import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { File, Directory, Paths } from 'expo-file-system';
import { createDownloadResumable } from 'expo-file-system/legacy';
import {
  DownloadProviderScope,
  doesTrackMatchProviderScope,
} from '@/utils/downloads/provider';
import {
  DownloadedCollectionEntry,
  DownloadedTrackEntry,
  PersistedDownloadStore,
  loadStore,
  saveStore,
  mimeTypeToExt,
} from '@/utils/downloads/downloadStore';
import { Song } from '@/types';
import { useApi } from '@/api';

const SERVER_URL = 'https://rawarr-server-af0092d911f6.herokuapp.com';

const buildDownloadUrl = (song: Song, quality: string = 'medium') => {
  return `${SERVER_URL}/upload-audio?quality=${quality}&url=${encodeURIComponent(song.streamUrl)}`;
};

// Helper paths
const downloadsDir = () => new Directory(Paths.document, 'yuzic-downloads');

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

  const storeRef = useRef<PersistedDownloadStore>({ tracks: {}, collections: {} });
  const activeDownloadsRef = useRef<Map<string, any>>(new Map());
  const [, setProgressMap] = useState<Record<string, number>>({});
  const [downloadStateVersion, setDownloadStateVersion] = useState(0);

  const bumpVersion = useCallback(() => setDownloadStateVersion(v => v + 1), []);

  useEffect(() => {
    (async () => {
      let store = await loadStore();

      const validTracks: typeof store.tracks = {};
      for (const [id, entry] of Object.entries(store.tracks)) {
        try {
          if (new File(entry.localPath).exists) {
            validTracks[id] = entry;
          }
        } catch {}
      }

      if (Object.keys(validTracks).length !== Object.keys(store.tracks).length) {
        store = { ...store, tracks: validTracks };
        await saveStore(store);
      }

      storeRef.current = store;

      try {
        downloadsDir().create({ intermediates: true, idempotent: true });
      } catch {}

      bumpVersion();
    })();
  }, [bumpVersion]);

  const downloadSong = useCallback(async (song: Song, _collectionId?: string) => {
    if (storeRef.current.tracks[song.id]) return;
    if (activeDownloadsRef.current.has(song.id)) return;

    const tmpFile = new File(Paths.document, 'yuzic-downloads', song.id + '.tmp');
    const tmpPath = tmpFile.uri;

    const progressCb = ({ totalBytesWritten, totalBytesExpectedToWrite }: any) => {
      const pct = totalBytesExpectedToWrite > 0
        ? totalBytesWritten / totalBytesExpectedToWrite
        : 0;

      setProgressMap(prev => ({ ...prev, [song.id]: pct }));
    };

    const downloadUrl = buildDownloadUrl(song);

    const task = createDownloadResumable(downloadUrl, tmpPath, {}, progressCb);
    activeDownloadsRef.current.set(song.id, task);

    try {
      const result = await task.downloadAsync();
      if (!result) return;

      if (!tmpFile.exists) return;

      const ext = mimeTypeToExt(result.mimeType);
      const finalFile = new File(Paths.document, 'yuzic-downloads', song.id + ext);

      tmpFile.move(finalFile);

      if (!finalFile.exists) return;

      const entry: DownloadedTrackEntry = {
        trackId: song.id,
        localPath: finalFile.uri,
        fileSize: finalFile.size ?? 0,
        downloadedAt: Date.now(),
        albumId: song.albumId,
        artistId: song.artistId,
        serverId: song.sourceServerId ?? '',
        serverType: song.sourceServerType ?? '',
        coverKind: song.cover.kind,
      };

      storeRef.current = {
        ...storeRef.current,
        tracks: { ...storeRef.current.tracks, [song.id]: entry },
      };

      await saveStore(storeRef.current);
      bumpVersion();
    } catch (err) {
      console.warn('[DownloadContext] Download error', err);
    } finally {
      try { tmpFile.delete(); } catch {}
      activeDownloadsRef.current.delete(song.id);
      setProgressMap(prev => {
        const next = { ...prev };
        delete next[song.id];
        return next;
      });
    }
  }, [bumpVersion]);

  const downloadAlbumById = useCallback(async (albumId: string) => {
    const album = await api.albums.get(albumId);
    const songs = album.songs ?? [];
    for (const song of songs) {
      await downloadSong(song, albumId);
    }
    const trackIds = songs.map(s => s.id);
    storeRef.current = {
      ...storeRef.current,
      collections: {
        ...storeRef.current.collections,
        [albumId]: { id: albumId, type: 'album', trackIds, downloadedAt: Date.now() },
      },
    };
    await saveStore(storeRef.current);
    bumpVersion();
  }, [api, downloadSong, bumpVersion]);

  const downloadPlaylistById = useCallback(async (playlistId: string) => {
    const playlist = await api.playlists.get(playlistId);
    const songs = playlist.songs ?? [];
    for (const song of songs) {
      await downloadSong(song, playlistId);
    }
    const trackIds = songs.map(s => s.id);
    storeRef.current = {
      ...storeRef.current,
      collections: {
        ...storeRef.current.collections,
        [playlistId]: { id: playlistId, type: 'playlist', trackIds, downloadedAt: Date.now() },
      },
    };
    await saveStore(storeRef.current);
    bumpVersion();
  }, [api, downloadSong, bumpVersion]);

  const isTrackDownloaded = (id: string) => !!storeRef.current.tracks[id];
  const isTrackDownloading = (id: string) => activeDownloadsRef.current.has(id);

  const getLocalPath = (id: string) =>
    storeRef.current.tracks[id]?.localPath ?? null;

  const cancelDownload = async (id: string) => {
    const task = activeDownloadsRef.current.get(id);
    if (task) {
      await task.cancelAsync().catch(() => {});
      activeDownloadsRef.current.delete(id);
    }
  };

  const deleteDownloadedTrack = useCallback(async (trackId: string) => {
    const entry = storeRef.current.tracks[trackId];
    if (!entry) return;
    try { new File(entry.localPath).delete(); } catch {}
    const { [trackId]: _removed, ...remaining } = storeRef.current.tracks;
    storeRef.current = { ...storeRef.current, tracks: remaining };
    await saveStore(storeRef.current);
    bumpVersion();
  }, [bumpVersion]);

  const removeDownloadByCollectionId = useCallback(async (
    id: string,
    trackIds: string[],
    scope?: DownloadProviderScope
  ) => {
    for (const trackId of trackIds) {
      const entry = storeRef.current.tracks[trackId];
      if (!entry) continue;
      if (scope && !doesTrackMatchProviderScope(entry, scope)) continue;
      await deleteDownloadedTrack(trackId);
    }
    const { [id]: _removed, ...remainingCollections } = storeRef.current.collections;
    storeRef.current = { ...storeRef.current, collections: remainingCollections };
    await saveStore(storeRef.current);
    bumpVersion();
  }, [deleteDownloadedTrack, bumpVersion]);

  const getCollectionDownloadState = (trackIds: string[]) => {
    if (trackIds.length === 0) return { isDownloaded: false, isDownloading: false };
    const isDownloaded = trackIds.every(id => !!storeRef.current.tracks[id]);
    const isDownloading = trackIds.some(id => activeDownloadsRef.current.has(id));
    return { isDownloaded, isDownloading };
  };

  const cancelCollectionDownloads = useCallback(async (collectionId: string) => {
    const collection = storeRef.current.collections[collectionId];
    if (!collection) return;
    for (const trackId of collection.trackIds) {
      await cancelDownload(trackId);
    }
  }, [cancelDownload]);

  const cancelDownloadAll = useCallback(async () => {
    for (const [, task] of activeDownloadsRef.current) {
      await task.cancelAsync().catch(() => {});
    }
    activeDownloadsRef.current.clear();
  }, []);

  const clearDownloadsForProvider = useCallback(async (scope?: DownloadProviderScope) => {
    const tracksToDelete = Object.values(storeRef.current.tracks).filter(
      entry => !scope || doesTrackMatchProviderScope(entry, scope)
    );
    for (const entry of tracksToDelete) {
      await deleteDownloadedTrack(entry.trackId);
    }
    const deletedTrackIds = new Set(tracksToDelete.map(e => e.trackId));
    const remainingCollections: typeof storeRef.current.collections = {};
    for (const [colId, col] of Object.entries(storeRef.current.collections)) {
      const remaining = col.trackIds.filter(id => !deletedTrackIds.has(id));
      if (remaining.length > 0) {
        remainingCollections[colId] = { ...col, trackIds: remaining };
      }
    }
    storeRef.current = { ...storeRef.current, collections: remainingCollections };
    await saveStore(storeRef.current);
    bumpVersion();
  }, [deleteDownloadedTrack, bumpVersion]);

  const clearAllDownloads = async () => {
    for (const [, task] of activeDownloadsRef.current) {
      await task.cancelAsync().catch(() => {});
    }
    activeDownloadsRef.current.clear();

    try { downloadsDir().delete(); } catch {}
    try { downloadsDir().create({ intermediates: true, idempotent: true }); } catch {}

    storeRef.current = { tracks: {}, collections: {} };
    await saveStore(storeRef.current);
    setProgressMap({});
    bumpVersion();
  };

  const totalDownloadedBytes = Object.values(storeRef.current.tracks)
    .reduce((sum, t) => sum + t.fileSize, 0);

  const downloadedTrackCount = Object.keys(storeRef.current.tracks).length;

  const value: DownloadContextType = {
    configure: () => {},
    downloadTrack: downloadSong,
    downloadPlaylist: async (playlistId, tracks) => {
      for (const t of tracks) await downloadSong(t, playlistId);
    },
    pauseDownload: async () => {},
    resumeDownload: async () => {},
    cancelDownload,
    isTrackDownloaded,
    getAllDownloadedTracks: () => Object.values(storeRef.current.tracks),
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
    downloadStateVersion,
    getLocalPath,
    getAllDownloadedCollections: () => Object.values(storeRef.current.collections),
    totalDownloadedBytes,
    downloadedTrackCount,
  };

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  );
};