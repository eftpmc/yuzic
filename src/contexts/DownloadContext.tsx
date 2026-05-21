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
import { useTranslation } from 'react-i18next';
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

export type DownloadedTrack = DownloadedTrackEntry & {
  localPath: string;
  originalTrack?: {
    id?: string;
    extraPayload?: {
      serverId?: string;
      serverType?: string;
      coverKind?: string;
    };
  };
};

// Stable operations — reference never changes after mount.
export type DownloadActionsType = {
  configure: (config: Record<string, unknown>) => void;
  downloadTrack: (track: Song, playlistId?: string) => Promise<void>;
  downloadPlaylist: (playlistId: string, tracks: Song[]) => Promise<void>;
  resumeDownload: (downloadId: string) => Promise<void>;
  cancelDownload: (downloadId: string) => Promise<void>;
  deleteDownloadedTrack: (trackId: string) => Promise<void>;
  setPlaybackSourcePreference: (pref: 'auto' | 'download' | 'network') => void;
  downloadAlbumById: (albumId: string, songs?: Song[]) => Promise<void>;
  downloadPlaylistById: (playlistId: string, songs?: Song[]) => Promise<void>;
  cancelCollectionDownloads: (collectionId: string) => Promise<void>;
  removeDownloadByCollectionId: (id: string, trackIds: string[], scope?: DownloadProviderScope) => Promise<void>;
  cancelDownloadAll: () => Promise<void>;
  clearDownloadsForProvider: (scope?: DownloadProviderScope) => Promise<void>;
  clearAllDownloads: () => Promise<void>;
  // Stable O(1) lookup via internal Map ref — safe for playback resolution.
  getLocalPath: (trackId: string) => string | null;
};

// Reactive state — updates when downloads change.
export type DownloadStateType = {
  isTrackDownloaded: (trackId: string) => boolean;
  isTrackDownloading: (trackId: string) => boolean;
  getCollectionDownloadState: (trackIds: string[]) => { isDownloaded: boolean; isDownloading: boolean };
  getAllDownloadedTracks: () => DownloadedTrack[];
  getAllDownloadedCollections: () => DownloadedCollectionEntry[];
  getStorageInfo: () => Promise<{ totalBytes: number; downloadedTracks: number; availableBytes?: number }>;
  getSongLocalUri: (songId: string) => Promise<string | null>;
  downloadedTracks: DownloadedTrack[];
  downloadStateVersion: number;
  totalDownloadedBytes: number;
  downloadedTrackCount: number;
};

// Backward-compatible combined type.
export type DownloadContextType = DownloadActionsType & DownloadStateType;

const DownloadActionsContext = createContext<DownloadActionsType | undefined>(undefined);
const DownloadStateContext = createContext<DownloadStateType | undefined>(undefined);

const DOWNLOAD_DIR = `${FileSystem.documentDirectory ?? ''}downloads/audio/`;
const TEMP_DOWNLOAD_DIR = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}downloads/rawarr-source/`;
const DOWNLOAD_QUALITY = 'high';
const DOWNLOAD_SCHEMA_VERSION = 2;
const BACKGROUND_FILE_OPTIONS = {
  sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
};

type LocalDownloadedTrackEntry = DownloadedTrackEntry & {
  localPath: string;
  schemaVersion?: number;
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

let legacyDownloadPathsToDelete: string[] = [];

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

// Re-roots a stored localPath to the current documentDirectory so downloads
// survive app reinstalls or updates that rotate the iOS container UUID.
function rerootLocalPath(storedPath: string): string {
  const docDir = FileSystem.documentDirectory;
  if (!docDir || storedPath.startsWith(docDir)) return storedPath;
  const marker = 'downloads/';
  const idx = storedPath.indexOf(marker);
  if (idx !== -1) return `${docDir}${storedPath.slice(idx)}`;
  return storedPath;
}

function hasCurrentDownloadMetadata(track: LocalDownloadedTrackEntry): boolean {
  if (track.schemaVersion === DOWNLOAD_SCHEMA_VERSION) return true;

  const payload = track.originalTrack?.extraPayload;
  return Boolean(
    track.localPath &&
    track.trackId &&
    track.serverId &&
    track.serverType &&
    track.coverKind &&
    payload?.serverId &&
    payload?.serverType &&
    payload?.coverKind
  );
}

function loadInitialState(): DownloadState {
  const snapshot = readDownloadsSnapshot();
  const stalePaths: string[] = [];
  let didMigrate = false;

  const tracks = snapshot.tracks
    .map((track): LocalDownloadedTrackEntry | null => {
      const localTrack = track as LocalDownloadedTrackEntry;
      const localPath = localTrack.localPath;

      if (!localPath) {
        didMigrate = true;
        return null;
      }

      if (!hasCurrentDownloadMetadata(localTrack)) {
        stalePaths.push(rerootLocalPath(localPath));
        didMigrate = true;
        return null;
      }

      const rerootedPath = rerootLocalPath(localPath);
      if (rerootedPath !== localPath) didMigrate = true;

      return {
        ...localTrack,
        localPath: rerootedPath,
        schemaVersion: DOWNLOAD_SCHEMA_VERSION,
      };
    })
    .filter((track): track is LocalDownloadedTrackEntry => !!track);

  const validTrackIds = new Set(tracks.map(track => track.trackId));
  let didMigrateCollections = false;
  const collections = snapshot.collections
    .map(collection => {
      const trackIds = Array.isArray(collection.trackIds) ? collection.trackIds : [];
      const validCollectionTrackIds = trackIds.filter(trackId => validTrackIds.has(trackId));
      if (validCollectionTrackIds.length !== trackIds.length) didMigrateCollections = true;
      return {
        ...collection,
        trackIds: validCollectionTrackIds,
      };
    })
    .filter(collection => collection.trackIds.length > 0);
  const jobs = snapshot.jobs.filter(job => Array.isArray(job.tracks) && job.tracks.length > 0);

  if (didMigrate || didMigrateCollections || collections.length !== snapshot.collections.length) {
    writeDownloadedTracks(tracks);
    writeDownloadedCollections(collections);
  }

  legacyDownloadPathsToDelete = stalePaths;

  return {
    tracks,
    collections,
    jobs,
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

export const useDownloadActions = (): DownloadActionsType => {
  const ctx = useContext(DownloadActionsContext);
  if (!ctx) throw new Error('useDownloadActions must be used within DownloadProvider');
  return ctx;
};

export const useDownloadState = (): DownloadStateType => {
  const ctx = useContext(DownloadStateContext);
  if (!ctx) throw new Error('useDownloadState must be used within DownloadProvider');
  return ctx;
};

// Backward-compatible hook — prefer useDownloadActions or useDownloadState for new code.
export const useDownload = (): DownloadContextType => {
  const actions = useDownloadActions();
  const state = useDownloadState();
  return useMemo(() => ({ ...actions, ...state }), [actions, state]);
};

export const DownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const api = useApi();
  const activeServer = useSelector(selectActiveServer);
  const localPathMapRef = useRef<Map<string, string>>(new Map());
  const [state, setState] = useState<DownloadState>(() => {
    const initial = loadInitialState();
    const map = new Map<string, string>();
    for (const track of initial.tracks) {
      map.set(track.trackId, normalizeLocalUri(track.localPath));
    }
    localPathMapRef.current = map;
    return initial;
  });
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(() => new Set());
  const jobsRef = useRef<PersistedDownloadJob[]>(state.jobs);
  const processingQueueRef = useRef(false);

  useEffect(() => {
    const stalePaths = legacyDownloadPathsToDelete;
    legacyDownloadPathsToDelete = [];

    if (!stalePaths.length) return;

    void Promise.all(stalePaths.map(path =>
      FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {})
    ));
  }, []);

  // Verify file existence on mount and purge entries whose files are missing.
  // This handles cases where the app was reinstalled or files were deleted
  // externally while the download metadata survived in MMKV.
  useEffect(() => {
    const verify = async () => {
      const tracks = state.tracks;
      if (!tracks.length) return;

      const results = await Promise.all(
        tracks.map(async track => {
          const info = await FileSystem.getInfoAsync(track.localPath).catch(() => ({ exists: false }));
          return info.exists ? null : track.trackId;
        })
      );

      const missingIds = results.filter((id): id is string => id !== null);
      if (!missingIds.length) return;

      const missing = new Set(missingIds);
      updateTracks(t => t.filter(track => !missing.has(track.trackId)));
      updateCollections(cols =>
        cols
          .map(col => ({ ...col, trackIds: col.trackIds.filter(id => !missing.has(id)) }))
          .filter(col => col.trackIds.length > 0)
      );
    };

    void verify();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    jobsRef.current = state.jobs;
  }, [state.jobs]);

  const updateTracks = useCallback((updater: (tracks: LocalDownloadedTrackEntry[]) => LocalDownloadedTrackEntry[]) => {
    setState(current => {
      const tracks = updater(current.tracks);
      persistTracks(tracks);
      const map = new Map<string, string>();
      for (const track of tracks) {
        map.set(track.trackId, normalizeLocalUri(track.localPath));
      }
      localPathMapRef.current = map;
      return { ...current, tracks };
    });
  }, []);

  const updateCollections = useCallback((updater: (collections: DownloadedCollectionEntry[]) => DownloadedCollectionEntry[]) => {
    setState(current => {
      const collections = updater(current.collections);
      writeDownloadedCollections(collections);
      return { ...current, collections };
    });
  }, []);

  const updateJobs = useCallback((updater: (jobs: PersistedDownloadJob[]) => PersistedDownloadJob[]) => {
    const jobs = updater(jobsRef.current);
    jobsRef.current = jobs;
    writeDownloadJobs(jobs);
    setState(current => ({ ...current, jobs }));
  }, []);

  // Stable O(1) lookup — reads from ref kept in sync inside updateTracks.
  const getLocalPath = useCallback((trackId: string): string | null => {
    return localPathMapRef.current.get(trackId) ?? null;
  }, []);

  const isTrackDownloaded = useCallback(
    (trackId: string) => localPathMapRef.current.has(trackId),
    [], // ref reads never need deps — localPathMapRef.current is always current
  );

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
  }, []);

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
        schemaVersion: DOWNLOAD_SCHEMA_VERSION,
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

  const CONCURRENT_TRACK_DOWNLOADS = 3;

  const processDownloadQueue = useCallback(async () => {
    if (processingQueueRef.current) return;
    processingQueueRef.current = true;

    try {
      await ensureDownloadDir();
      await cleanupTempDownloads();

      while (jobsRef.current.length > 0) {
        const [job] = jobsRef.current;
        if (!job) break;

        let failed = false;
        for (let i = 0; i < job.tracks.length; i += CONCURRENT_TRACK_DOWNLOADS) {
          const chunk = job.tracks.slice(i, i + CONCURRENT_TRACK_DOWNLOADS);
          const results = await Promise.allSettled(
            chunk.map(track => performDownloadTrack(track, job.collectionId))
          );
          if (results.some(r => r.status === 'rejected')) {
            console.warn('Download job paused until next resume');
            failed = true;
            break;
          }
        }

        if (failed) break;
        removeJob(job.id);
      }
    } finally {
      processingQueueRef.current = false;
    }
  }, [performDownloadTrack, removeJob]);

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
      toast.success(t('settings.downloaders.downloadComplete'));
    } catch (error) {
      console.warn('Album download failed', error);
      toast.error(t('externalAlbum.download.failed'));
    }
  }, [api, downloadCollection, t]);

  const downloadPlaylistById = useCallback(async (playlistId: string, songs?: Song[]) => {
    const tracks = songs?.length
      ? songs
      : (await api.playlists.get(playlistId))?.songs ?? [];
    if (!tracks.length) return;

    try {
      await downloadCollection(playlistId, 'playlist', tracks);
      toast.success(t('settings.downloaders.downloadComplete'));
    } catch (error) {
      console.warn('Playlist download failed', error);
      toast.error(t('externalAlbum.download.failed'));
    }
  }, [api, downloadCollection, t]);

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
    albumId: track.albumId,
    artistId: track.artistId,
    serverId: track.serverId,
    serverType: track.serverType,
    coverKind: track.coverKind,
    originalTrack: track.originalTrack,
  })), [state.tracks]);

  const actionsValue = useMemo<DownloadActionsType>(() => ({
    configure: () => {},
    setPlaybackSourcePreference: () => {},
    downloadTrack,
    downloadPlaylist,
    resumeDownload,
    cancelDownload,
    deleteDownloadedTrack,
    downloadAlbumById,
    downloadPlaylistById,
    cancelCollectionDownloads,
    removeDownloadByCollectionId,
    cancelDownloadAll,
    clearDownloadsForProvider,
    clearAllDownloads,
    getLocalPath,
  }), [
    cancelCollectionDownloads,
    cancelDownload,
    cancelDownloadAll,
    clearAllDownloads,
    clearDownloadsForProvider,
    deleteDownloadedTrack,
    downloadAlbumById,
    downloadPlaylist,
    downloadPlaylistById,
    downloadTrack,
    getLocalPath,
    removeDownloadByCollectionId,
    resumeDownload,
  ]);

  const stateValue = useMemo<DownloadStateType>(() => ({
    isTrackDownloaded,
    isTrackDownloading,
    getCollectionDownloadState,
    getAllDownloadedTracks: () => downloadedTracks,
    getAllDownloadedCollections: () => state.collections,
    getStorageInfo: async () => ({
      totalBytes: state.tracks.reduce((sum, track) => sum + track.fileSize, 0),
      downloadedTracks: state.tracks.length,
      availableBytes: undefined,
    }),
    getSongLocalUri: async (songId: string) => getLocalPath(songId),
    downloadedTracks,
    downloadStateVersion: downloadedTracks.length,
    totalDownloadedBytes: state.tracks.reduce((sum, track) => sum + track.fileSize, 0),
    downloadedTrackCount: state.tracks.length,
  }), [
    downloadedTracks,
    getCollectionDownloadState,
    getLocalPath,
    isTrackDownloaded,
    isTrackDownloading,
    state.collections,
    state.tracks,
  ]);

  return (
    <DownloadActionsContext.Provider value={actionsValue}>
      <DownloadStateContext.Provider value={stateValue}>
        {children}
      </DownloadStateContext.Provider>
    </DownloadActionsContext.Provider>
  );
};
