import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { toast } from '@backpackapp-io/react-native-toast';
import { useSelector } from 'react-redux';
import { buildRawarrAudioTranscodeUrl } from '@/api/rawarr/audio';
import { useApi } from '@/api';
import type { Song } from '@/types';
import {
  doesTrackMatchProviderScope,
  DownloadProviderScope,
  getDownloadedTrackServerId,
  normalizeServerId,
} from '@/utils/downloads/provider';
import {
  DownloadedCollectionEntry,
  DownloadedTrackEntry,
} from '@/utils/downloads/downloadStore';
import {
  readDownloadsSnapshot,
  PersistedDownloadJob,
  writeDownloadedCollections,
  writeDownloadJobs,
  writeDownloadedTracks,
} from '@/utils/downloads/localDownloadStore';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';

export type DownloadedTrack = {
  trackId: string;
  localPath: string;
  fileSize: number;
  downloadedAt: number;
  originalTrack?: { id?: string };
};

type DownloadContextType = {
  configure: (config: Record<string, unknown>) => void;
  downloadTrack: (track: Song, playlistId?: string) => Promise<void>;
  downloadPlaylist: (playlistId: string, tracks: Song[]) => Promise<void>;
  pauseDownload: (downloadId: string) => Promise<void>;
  resumeDownload: (downloadId: string) => Promise<void>;
  cancelDownload: (downloadId: string) => Promise<void>;
  isTrackDownloaded: (trackId: string) => boolean;
  getAllDownloadedTracks: () => DownloadedTrack[];
  deleteDownloadedTrack: (trackId: string) => Promise<void>;
  getStorageInfo: () => Promise<{
    totalBytes: number;
    downloadedTracks: number;
    availableBytes?: number;
  }>;
  setPlaybackSourcePreference: (pref: 'auto' | 'download' | 'network') => void;
  downloadAlbumById: (albumId: string, songs?: Song[]) => Promise<void>;
  downloadPlaylistById: (playlistId: string, songs?: Song[]) => Promise<void>;
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
  downloadedTracks: DownloadedTrack[];
  getLocalPath: (trackId: string) => string | null;
  getSongLocalUri: (songId: string) => Promise<string | null>;
  getAllDownloadedCollections: () => DownloadedCollectionEntry[];
  totalDownloadedBytes: number;
  downloadedTrackCount: number;
};

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

const DOWNLOAD_DIR = `${FileSystem.documentDirectory ?? ''}downloads/audio/`;
const TEMP_DOWNLOAD_DIR = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}downloads/rawarr-source/`;
const DOWNLOAD_QUALITY = 'high';
const BACKGROUND_FILE_OPTIONS = {
  sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
};

type LocalDownloadedTrackEntry = DownloadedTrackEntry & {
  localPath: string;
  title?: string;
  originalTrack?: {
    id?: string;
    extraPayload?: {
      serverId?: string;
      serverType?: string;
      coverKind?: string;
    };
  };
};

type DownloadState = {
  tracks: LocalDownloadedTrackEntry[];
  collections: DownloadedCollectionEntry[];
  jobs: PersistedDownloadJob[];
};

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'track';
}

function buildTrackPath(track: Song): string {
  return `${DOWNLOAD_DIR}${sanitizeFileName(track.id)}.mp3`;
}

function buildSourceTempPath(track: Song): string {
  return `${TEMP_DOWNLOAD_DIR}${sanitizeFileName(track.id)}-${Date.now()}.source`;
}

async function ensureDownloadDir() {
  if (!FileSystem.documentDirectory) throw new Error('Document directory unavailable');
  const downloadInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!downloadInfo.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
  }
  const tempInfo = await FileSystem.getInfoAsync(TEMP_DOWNLOAD_DIR);
  if (!tempInfo.exists) {
    await FileSystem.makeDirectoryAsync(TEMP_DOWNLOAD_DIR, { intermediates: true });
  }
}

async function cleanupTempDownloads() {
  const info = await FileSystem.getInfoAsync(TEMP_DOWNLOAD_DIR);
  if (info.exists) {
    await FileSystem.deleteAsync(TEMP_DOWNLOAD_DIR, { idempotent: true }).catch(() => {});
  }
  await FileSystem.makeDirectoryAsync(TEMP_DOWNLOAD_DIR, { intermediates: true }).catch(() => {});
}

function normalizeLocalUri(uri: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(uri)) return uri;
  return `file://${uri}`;
}

function loadInitialState(): DownloadState {
  const snapshot = readDownloadsSnapshot();
  return {
    tracks: snapshot.tracks
      .map((track): LocalDownloadedTrackEntry | null => {
        const localPath = (track as LocalDownloadedTrackEntry).localPath;
        if (!localPath) return null;
        return {
          ...track,
          localPath,
          originalTrack: (track as LocalDownloadedTrackEntry).originalTrack ?? { id: track.trackId },
        };
      })
      .filter((track): track is LocalDownloadedTrackEntry => !!track),
    collections: snapshot.collections,
    jobs: snapshot.jobs.filter(job => Array.isArray(job.tracks) && job.tracks.length > 0),
  };
}

function persistTracks(tracks: LocalDownloadedTrackEntry[]) {
  writeDownloadedTracks(tracks);
}

async function transcodeViaHostedRawarr(sourcePath: string): Promise<string> {
  const response = await FileSystem.uploadAsync(
    buildRawarrAudioTranscodeUrl(),
    sourcePath,
    {
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'file',
      mimeType: 'application/octet-stream',
      parameters: {
        quality: DOWNLOAD_QUALITY,
      },
      ...BACKGROUND_FILE_OPTIONS,
    }
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Rawarr upload failed (${response.status})`);
  }

  const data = JSON.parse(response.body) as { downloadUrl?: string };
  if (!data.downloadUrl) throw new Error('Rawarr did not return a download URL');
  return data.downloadUrl;
}

export const useDownload = (): DownloadContextType => {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownload must be used within DownloadProvider');
  return ctx;
};

export const DownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const [state, setState] = useState<DownloadState>(() => loadInitialState());
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(() => new Set());
  const [stateVersion, setStateVersion] = useState(0);
  const jobsRef = useRef<PersistedDownloadJob[]>(state.jobs);
  const processingQueueRef = useRef(false);

  const bump = useCallback(() => setStateVersion(version => version + 1), []);

  useEffect(() => {
    jobsRef.current = state.jobs;
  }, [state.jobs]);

  const updateTracks = useCallback((updater: (tracks: LocalDownloadedTrackEntry[]) => LocalDownloadedTrackEntry[]) => {
    setState(current => {
      const tracks = updater(current.tracks);
      persistTracks(tracks);
      return { ...current, tracks };
    });
    bump();
  }, [bump]);

  const updateCollections = useCallback((updater: (collections: DownloadedCollectionEntry[]) => DownloadedCollectionEntry[]) => {
    setState(current => {
      const collections = updater(current.collections);
      writeDownloadedCollections(collections);
      return { ...current, collections };
    });
    bump();
  }, [bump]);

  const updateJobs = useCallback((updater: (jobs: PersistedDownloadJob[]) => PersistedDownloadJob[]) => {
    const jobs = updater(jobsRef.current);
    jobsRef.current = jobs;
    writeDownloadJobs(jobs);
    setState(current => ({ ...current, jobs }));
    bump();
  }, [bump]);

  const getLocalPath = useCallback((trackId: string): string | null => {
    const entry = state.tracks.find(track => track.trackId === trackId);
    return entry ? normalizeLocalUri(entry.localPath) : null;
  }, [state.tracks]);

  const isTrackDownloaded = useCallback((trackId: string) => !!getLocalPath(trackId), [getLocalPath]);

  const isTrackDownloading = useCallback(
    (trackId: string) => downloadingIds.has(trackId),
    [downloadingIds]
  );

  const setTrackDownloading = useCallback((trackId: string, downloading: boolean) => {
    setDownloadingIds(current => {
      const next = new Set(current);
      if (downloading) next.add(trackId);
      else next.delete(trackId);
      return next;
    });
    bump();
  }, [bump]);

  const resolveTrack = useCallback(async (track: Song): Promise<Song | null> => {
    const fullSong = await api.tracks.get(track.id).catch(() => null);
    return fullSong ?? (track.streamUrl ? track : null);
  }, [api]);

  const performDownloadTrack = useCallback(async (track: Song, collectionId?: string) => {
    if (isTrackDownloaded(track.id) || isTrackDownloading(track.id)) return;

    const resolvedTrack = await resolveTrack(track);
    if (!resolvedTrack?.streamUrl) {
      throw new Error('Track stream URL unavailable');
    }

    await ensureDownloadDir();
    setTrackDownloading(track.id, true);
    const localPath = buildTrackPath(track);
    const sourcePath = buildSourceTempPath(track);

    try {
      const sourceResult = await FileSystem.downloadAsync(
        resolvedTrack.streamUrl,
        sourcePath,
        BACKGROUND_FILE_OPTIONS
      );
      if (sourceResult.status < 200 || sourceResult.status >= 300) {
        throw new Error(`Source download failed (${sourceResult.status})`);
      }

      const transcodedDownloadUrl = await transcodeViaHostedRawarr(sourcePath);
      const result = await FileSystem.downloadAsync(
        transcodedDownloadUrl,
        localPath,
        BACKGROUND_FILE_OPTIONS
      );
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Transcoded download failed (${result.status})`);
      }

      const info = await FileSystem.getInfoAsync(localPath);
      const fileSize = info.exists ? info.size : 0;
      const entry: LocalDownloadedTrackEntry = {
        trackId: track.id,
        localPath,
        fileSize,
        downloadedAt: Date.now(),
        albumId: track.albumId,
        artistId: track.artistId,
        serverId: resolvedTrack.sourceServerId ?? activeServer?.id ?? '',
        serverType: resolvedTrack.sourceServerType ?? activeServer?.type ?? '',
        coverKind: track.cover.kind,
        title: track.title,
        originalTrack: {
          id: track.id,
          extraPayload: {
            serverId: resolvedTrack.sourceServerId ?? activeServer?.id ?? '',
            serverType: resolvedTrack.sourceServerType ?? activeServer?.type ?? '',
            coverKind: track.cover.kind,
          },
        },
      };

      updateTracks(tracks => [
        ...tracks.filter(existing => existing.trackId !== track.id),
        entry,
      ]);

      if (collectionId) {
        updateCollections(collections => {
          const existing = collections.find(collection => collection.id === collectionId);
          if (!existing) return collections;
          return collections.map(collection => (
            collection.id === collectionId
              ? { ...collection, trackIds: [...new Set([...collection.trackIds, track.id])] }
              : collection
          ));
        });
      }
    } catch (error) {
      await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
      throw error;
    } finally {
      await FileSystem.deleteAsync(sourcePath, { idempotent: true }).catch(() => {});
      setTrackDownloading(track.id, false);
    }
  }, [activeServer?.id, activeServer?.type, isTrackDownloaded, isTrackDownloading, resolveTrack, setTrackDownloading, updateCollections, updateTracks]);

  const removeJob = useCallback((jobId: string) => {
    updateJobs(jobs => jobs.filter(job => job.id !== jobId));
  }, [updateJobs]);

  const processDownloadQueue = useCallback(async () => {
    if (processingQueueRef.current) return;
    processingQueueRef.current = true;

    try {
      await ensureDownloadDir();
      await cleanupTempDownloads();

      while (jobsRef.current.length > 0) {
        const [job] = jobsRef.current;
        if (!job) break;

        try {
          for (const track of job.tracks) {
            await performDownloadTrack(track, job.collectionId);
          }
          removeJob(job.id);
        } catch (error) {
          console.warn('Download job paused until next resume', error);
          break;
        }
      }
    } finally {
      processingQueueRef.current = false;
      bump();
    }
  }, [bump, performDownloadTrack, removeJob]);

  const enqueueDownloadJob = useCallback(async (job: Omit<PersistedDownloadJob, 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    updateJobs(jobs => {
      const existing = jobs.find(existingJob => existingJob.id === job.id);
      const nextJob: PersistedDownloadJob = {
        ...job,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };

      return [
        ...jobs.filter(existingJob => existingJob.id !== job.id),
        nextJob,
      ];
    });

    await processDownloadQueue();
  }, [processDownloadQueue, updateJobs]);

  const downloadTrack = useCallback(async (track: Song, collectionId?: string) => {
    await enqueueDownloadJob({
      id: `track:${track.id}`,
      type: 'track',
      collectionId,
      tracks: [track],
    });
  }, [enqueueDownloadJob]);

  const downloadCollection = useCallback(async (
    collectionId: string,
    type: DownloadedCollectionEntry['type'],
    tracks: Song[],
  ) => {
    const trackIds = tracks.map(track => track.id);
    updateCollections(collections => [
      ...collections.filter(collection => collection.id !== collectionId),
      {
        id: collectionId,
        type,
        trackIds,
        downloadedAt: Date.now(),
      },
    ]);

    await enqueueDownloadJob({
      id: `${type}:${collectionId}`,
      type,
      collectionId,
      tracks,
    });
  }, [enqueueDownloadJob, updateCollections]);

  const downloadAlbumById = useCallback(async (albumId: string, songs?: Song[]) => {
    const tracks = songs?.length
      ? songs
      : (await api.albums.get(albumId))?.songs ?? [];
    if (!tracks.length) return;

    try {
      await downloadCollection(albumId, 'album', tracks);
      toast.success('Download complete!');
    } catch (error) {
      console.warn('Album download failed', error);
      toast.error('Download failed.');
    }
  }, [api, downloadCollection]);

  const downloadPlaylistById = useCallback(async (playlistId: string, songs?: Song[]) => {
    const tracks = songs?.length
      ? songs
      : (await api.playlists.get(playlistId))?.songs ?? [];
    if (!tracks.length) return;

    try {
      await downloadCollection(playlistId, 'playlist', tracks);
      toast.success('Download complete!');
    } catch (error) {
      console.warn('Playlist download failed', error);
      toast.error('Download failed.');
    }
  }, [api, downloadCollection]);

  const downloadPlaylist = useCallback(
    (playlistId: string, tracks: Song[]) => downloadPlaylistById(playlistId, tracks),
    [downloadPlaylistById]
  );

  const deleteDownloadedTrack = useCallback(async (trackId: string) => {
    const entry = state.tracks.find(track => track.trackId === trackId);
    if (entry) {
      await FileSystem.deleteAsync(entry.localPath, { idempotent: true }).catch(() => {});
    }
    updateTracks(tracks => tracks.filter(track => track.trackId !== trackId));
    updateCollections(collections => collections
      .map(collection => ({
        ...collection,
        trackIds: collection.trackIds.filter(id => id !== trackId),
      }))
      .filter(collection => collection.trackIds.length > 0));
  }, [state.tracks, updateCollections, updateTracks]);

  const removeDownloadByCollectionId = useCallback(async (
    id: string,
    trackIds: string[],
    scope?: DownloadProviderScope,
  ) => {
    const ids = new Set(trackIds);
    const tracksToDelete = state.tracks.filter(track =>
      ids.has(track.trackId) && doesTrackMatchProviderScope(track, scope)
    );

    await Promise.all(tracksToDelete.map(track =>
      FileSystem.deleteAsync(track.localPath, { idempotent: true }).catch(() => {})
    ));

    updateTracks(tracks => tracks.filter(track => !tracksToDelete.some(deleted => deleted.trackId === track.trackId)));
    updateCollections(collections => collections.filter(collection => collection.id !== id));
    updateJobs(jobs => jobs.filter(job => job.collectionId !== id && job.id !== id));
  }, [state.tracks, updateCollections, updateJobs, updateTracks]);

  const clearDownloadsForProvider = useCallback(async (scope?: DownloadProviderScope) => {
    const tracksToDelete = state.tracks.filter(track => doesTrackMatchProviderScope(track, scope));
    await Promise.all(tracksToDelete.map(track =>
      FileSystem.deleteAsync(track.localPath, { idempotent: true }).catch(() => {})
    ));
    const deletedIds = new Set(tracksToDelete.map(track => track.trackId));
    const serverId = normalizeServerId(scope?.serverId);

    updateTracks(tracks => tracks.filter(track => !deletedIds.has(track.trackId)));
    updateCollections(collections => collections.filter(collection => {
      if (!serverId) return false;
      const collectionTracks = collection.trackIds
        .map(trackId => state.tracks.find(track => track.trackId === trackId))
        .filter(Boolean) as LocalDownloadedTrackEntry[];
      return collectionTracks.some(track => getDownloadedTrackServerId(track) !== serverId);
    }));
    updateJobs(jobs => {
      if (!serverId) return [];
      return jobs.filter(job => job.tracks.some(track => track.sourceServerId !== serverId));
    });
  }, [state.tracks, updateCollections, updateJobs, updateTracks]);

  const clearAllDownloads = useCallback(async () => {
    await Promise.all(state.tracks.map(track =>
      FileSystem.deleteAsync(track.localPath, { idempotent: true }).catch(() => {})
    ));
    updateTracks(() => []);
    updateCollections(() => []);
    updateJobs(() => []);
  }, [state.tracks, updateCollections, updateJobs, updateTracks]);

  const cancelDownload = useCallback(async (downloadId: string) => {
    updateJobs(jobs => jobs.filter(job =>
      job.id !== downloadId &&
      job.collectionId !== downloadId &&
      !job.tracks.some(track => track.id === downloadId)
    ));
  }, [updateJobs]);

  const cancelCollectionDownloads = useCallback(async (collectionId: string) => {
    updateJobs(jobs => jobs.filter(job => job.collectionId !== collectionId && job.id !== collectionId));
  }, [updateJobs]);

  const cancelDownloadAll = useCallback(async () => {
    updateJobs(() => []);
  }, [updateJobs]);

  const resumeDownload = useCallback(async (downloadId: string) => {
    const hasJob = jobsRef.current.some(job =>
      job.id === downloadId ||
      job.collectionId === downloadId ||
      job.tracks.some(track => track.id === downloadId)
    );
    if (hasJob) {
      await processDownloadQueue();
    }
  }, [processDownloadQueue]);

  const getCollectionDownloadState = useCallback((trackIds: string[]) => {
    if (!trackIds.length) return { isDownloaded: false, isDownloading: false };
    const queuedTrackIds = new Set(state.jobs.flatMap(job => job.tracks.map(track => track.id)));
    return {
      isDownloaded: trackIds.every(isTrackDownloaded),
      isDownloading: trackIds.some(trackId => isTrackDownloading(trackId) || queuedTrackIds.has(trackId)),
    };
  }, [isTrackDownloaded, isTrackDownloading, state.jobs]);

  useEffect(() => {
    if (!processingQueueRef.current) {
      cleanupTempDownloads().catch(() => {});
    }

    if (jobsRef.current.length > 0) {
      void processDownloadQueue();
    }

    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && jobsRef.current.length > 0) {
        void processDownloadQueue();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [processDownloadQueue]);

  const downloadedTracks = useMemo<DownloadedTrack[]>(() => state.tracks.map(track => ({
    trackId: track.trackId,
    localPath: normalizeLocalUri(track.localPath),
    fileSize: track.fileSize,
    downloadedAt: track.downloadedAt,
    originalTrack: track.originalTrack,
  })), [state.tracks]);

  const value = useMemo<DownloadContextType>(() => ({
    configure: () => {},
    downloadTrack,
    downloadPlaylist,
    pauseDownload: async () => {},
    resumeDownload,
    cancelDownload,
    isTrackDownloaded,
    getAllDownloadedTracks: () => downloadedTracks,
    deleteDownloadedTrack,
    getStorageInfo: async () => ({
      totalBytes: state.tracks.reduce((sum, track) => sum + track.fileSize, 0),
      downloadedTracks: state.tracks.length,
      availableBytes: undefined,
    }),
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
    downloadStateVersion: stateVersion,
    downloadedTracks,
    getLocalPath,
    getSongLocalUri: async (songId: string) => getLocalPath(songId),
    getAllDownloadedCollections: () => state.collections,
    totalDownloadedBytes: state.tracks.reduce((sum, track) => sum + track.fileSize, 0),
    downloadedTrackCount: state.tracks.length,
  }), [
    clearAllDownloads,
    cancelCollectionDownloads,
    cancelDownload,
    cancelDownloadAll,
    clearDownloadsForProvider,
    deleteDownloadedTrack,
    downloadAlbumById,
    downloadPlaylist,
    downloadPlaylistById,
    downloadTrack,
    downloadedTracks,
    getCollectionDownloadState,
    getLocalPath,
    isTrackDownloaded,
    isTrackDownloading,
    removeDownloadByCollectionId,
    resumeDownload,
    state.collections,
    state.tracks,
    stateVersion,
  ]);

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  );
};
