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
import { useApi } from '@/api';
import type { Song } from '@/types';
import { DownloadProviderScope } from '@/utils/downloads/provider';
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
import {
  createDownloadJobRunner,
} from '@/utils/downloads/jobQueue';
import {
  collectionsWithoutTracks,
  jobMatchesCollectionId,
  jobMatchesDownloadId,
  jobsOutsideScope,
  orphanedTrackIds,
  trackIdsOfJobs,
  tracksInCollectionRemoval,
  tracksInScope,
  tracksWithout,
} from '@/utils/downloads/removal';
import {
  DOWNLOAD_SCHEMA_VERSION,
  STAGING_SUFFIX,
  extensionFromContentType,
  headerValue,
  normalizeLocalUri,
  restoreDownloadState,
  sanitizeFileName,
  type LocalDownloadedTrackEntry,
} from '@/utils/downloads/restore';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectDownloadOnWifiOnly, selectDownloadQuality } from '@/utils/redux/selectors/settingsSelectors';
import { useNetworkType } from '@/hooks/useNetworkType';

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
  /** Enqueue a batch of standalone tracks as a single download job. */
  downloadTracks: (tracks: Song[]) => Promise<void>;
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

// trackId → fraction in [0, 1], or -1 when the server streams without a
// Content-Length (transcoded streams) and the total is unknown.
// Split into its own context: it updates on every progress tick during an
// active download, and bundling it into DownloadStateContext re-rendered
// every consumer of useDownloadState() (every SongRow, TrackItem, etc. in
// the visible list) on each tick even though most only read
// isTrackDownloaded/isTrackDownloading.
export type DownloadProgressType = Record<string, number>;

const DownloadActionsContext = createContext<DownloadActionsType | undefined>(undefined);
const DownloadStateContext = createContext<DownloadStateType | undefined>(undefined);
const DownloadProgressContext = createContext<DownloadProgressType | undefined>(undefined);

const DOWNLOAD_DIR = `${FileSystem.documentDirectory ?? ''}downloads/audio/`;
// Scratch dir used by the retired download→upload→transcode pipeline; only
// referenced so upgrades can delete anything it left behind.
const LEGACY_TEMP_DOWNLOAD_DIR = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? ''}downloads/rawarr-source/`;
const MAX_JOB_ATTEMPTS = 5;
const BACKGROUND_FILE_OPTIONS = {
  sessionType: FileSystem.FileSystemSessionType.BACKGROUND,
};

type DownloadState = {
  tracks: LocalDownloadedTrackEntry[];
  collections: DownloadedCollectionEntry[];
  jobs: PersistedDownloadJob[];
};

let legacyDownloadPathsToDelete: string[] = [];

function buildStagingPath(track: Song): string {
  return `${DOWNLOAD_DIR}${sanitizeFileName(track.id)}${STAGING_SUFFIX}`;
}

async function ensureDownloadDir() {
  if (!FileSystem.documentDirectory) throw new Error('Document directory unavailable');
  const downloadInfo = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!downloadInfo.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
  }
}

async function cleanupLegacyTempDownloads() {
  const info = await FileSystem.getInfoAsync(LEGACY_TEMP_DOWNLOAD_DIR);
  if (info.exists) {
    await FileSystem.deleteAsync(LEGACY_TEMP_DOWNLOAD_DIR, { idempotent: true }).catch(() => {});
  }
}

// Downloads land in a .part staging file and only move to their final path on
// success, so a stray .part is always safe to delete.
async function cleanupStagingFiles() {
  const info = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!info.exists) return;
  const names = await FileSystem.readDirectoryAsync(DOWNLOAD_DIR).catch(() => [] as string[]);
  await Promise.all(
    names
      .filter(name => name.endsWith(STAGING_SUFFIX))
      .map(name => FileSystem.deleteAsync(`${DOWNLOAD_DIR}${name}`, { idempotent: true }).catch(() => {}))
  );
}

function loadInitialState(): DownloadState {
  const snapshot = readDownloadsSnapshot();
  const restored = restoreDownloadState(snapshot, FileSystem.documentDirectory ?? null);

  if (restored.changed) {
    writeDownloadedTracks(restored.tracks);
    writeDownloadedCollections(restored.collections);
  }

  legacyDownloadPathsToDelete = restored.stalePaths;

  return {
    tracks: restored.tracks,
    collections: restored.collections,
    jobs: restored.jobs,
  };
}

function persistTracks(tracks: LocalDownloadedTrackEntry[]) {
  writeDownloadedTracks(tracks);
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

// Subscribe to this only from components that render live progress (e.g. a
// progress ring) — it updates on every tick during an active download.
export const useDownloadProgress = (): DownloadProgressType => {
  const ctx = useContext(DownloadProgressContext);
  if (!ctx) throw new Error('useDownloadProgress must be used within DownloadProvider');
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
  const downloadQuality = useSelector(selectDownloadQuality);
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
  const [downloadProgress, setDownloadProgress] = useState<Record<string, number>>({});
  const jobsRef = useRef<PersistedDownloadJob[]>(state.jobs);
  const jobRunnerRef = useRef(createDownloadJobRunner<Song, PersistedDownloadJob>());
  const activeDownloadsRef = useRef<Map<string, FileSystem.DownloadResumable>>(new Map());
  const progressRef = useRef<Record<string, number>>({});
  const progressFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read through refs so the queue's identity doesn't change every time the
  // radio flips — `processDownloadQueue` is a dependency of half this file.
  const wifiOnly = useSelector(selectDownloadOnWifiOnly);
  const networkType = useNetworkType();
  const wifiOnlyRef = useRef(wifiOnly);
  const networkTypeRef = useRef(networkType);
  wifiOnlyRef.current = wifiOnly;
  networkTypeRef.current = networkType;

  useEffect(() => {
    const stalePaths = legacyDownloadPathsToDelete;
    legacyDownloadPathsToDelete = [];

    void cleanupLegacyTempDownloads();

    if (!stalePaths.length) return;

    void Promise.all(stalePaths.map(path =>
      FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {})
    ));
  }, []);

  useEffect(() => () => {
    if (progressFlushTimerRef.current) clearTimeout(progressFlushTimerRef.current);
  }, []);

  // Batches progress callbacks (which fire on every write) into at most ~3
  // state updates per second so a 3-track chunk doesn't re-render the tree
  // on every network buffer.
  const reportDownloadProgress = useCallback((trackId: string, written: number, expected: number) => {
    const fraction = expected > 0 ? Math.min(written / expected, 1) : -1;
    progressRef.current = { ...progressRef.current, [trackId]: fraction };
    if (progressFlushTimerRef.current) return;
    progressFlushTimerRef.current = setTimeout(() => {
      progressFlushTimerRef.current = null;
      setDownloadProgress(progressRef.current);
    }, 350);
  }, []);

  const clearDownloadProgress = useCallback((trackId: string) => {
    if (!(trackId in progressRef.current)) return;
    const { [trackId]: _removed, ...rest } = progressRef.current;
    progressRef.current = rest;
    setDownloadProgress(rest);
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
    const base = fullSong ?? (track.streamUrl ? track : null);
    if (!base) return null;
    const freshUrl = api.songs.buildStreamUrl(base.id, downloadQuality);
    return freshUrl ? { ...base, streamUrl: freshUrl } : base;
  }, [api, downloadQuality]);

  // The music server transcodes server-side (format/maxBitRate on the stream
  // URL — see qualityToStreamParams), so a single direct download replaces the
  // old download→upload-to-rawarr→transcode→re-download round trip.
  const performDownloadTrack = useCallback(async (track: Song, collectionId?: string) => {
    if (isTrackDownloaded(track.id) || isTrackDownloading(track.id)) return;

    const resolvedTrack = await resolveTrack(track);
    if (!resolvedTrack?.streamUrl) {
      throw new Error('Track stream URL unavailable');
    }

    await ensureDownloadDir();
    setTrackDownloading(track.id, true);
    const stagingPath = buildStagingPath(track);

    try {
      const resumable = FileSystem.createDownloadResumable(
        resolvedTrack.streamUrl,
        stagingPath,
        BACKGROUND_FILE_OPTIONS,
        progress => reportDownloadProgress(
          track.id,
          progress.totalBytesWritten,
          progress.totalBytesExpectedToWrite,
        ),
      );
      activeDownloadsRef.current.set(track.id, resumable);

      const result = await resumable.downloadAsync();
      // downloadAsync resolves undefined when cancelAsync() was called —
      // not an error, just nothing to record.
      if (!result) return;
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`Download failed (${result.status})`);
      }

      const extension = extensionFromContentType(headerValue(result.headers, 'Content-Type'));
      const localPath = `${DOWNLOAD_DIR}${sanitizeFileName(track.id)}.${extension}`;
      await FileSystem.deleteAsync(localPath, { idempotent: true }).catch(() => {});
      await FileSystem.moveAsync({ from: stagingPath, to: localPath });

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
    } finally {
      activeDownloadsRef.current.delete(track.id);
      clearDownloadProgress(track.id);
      await FileSystem.deleteAsync(stagingPath, { idempotent: true }).catch(() => {});
      setTrackDownloading(track.id, false);
    }
  }, [activeServer?.id, activeServer?.type, clearDownloadProgress, isTrackDownloaded, isTrackDownloading, reportDownloadProgress, resolveTrack, setTrackDownloading, updateCollections, updateTracks]);

  const removeJob = useCallback((jobId: string) => {
    updateJobs(jobs => jobs.filter(job => job.id !== jobId));
  }, [updateJobs]);

  const CONCURRENT_TRACK_DOWNLOADS = 3;

  const processDownloadQueue = useCallback(async () => {
    // Downloads are the one thing the app does that can run up a phone bill
    // without anyone asking for it — auto-download fires off a library sync,
    // not off a tap. Jobs stay queued and persisted, so the queue drains on
    // its own once WiFi is back; nothing is lost by waiting.
    if (wifiOnlyRef.current && networkTypeRef.current === 'cellular') return;

    await jobRunnerRef.current.run({
      getJobs: () => jobsRef.current,
      downloadTrack: (track, collectionId) => performDownloadTrack(track, collectionId),
      onJobComplete: job => removeJob(job.id),
      onJobRescheduled: (job, attempts) => {
        console.warn(`Download job ${job.id} paused until next resume (attempt ${attempts}/${MAX_JOB_ATTEMPTS})`);
        updateJobs(jobs => jobs.map(existing => (
          existing.id === job.id
            ? { ...existing, attempts, updatedAt: Date.now() }
            : existing
        )));
      },
      onJobDropped: (job, attempts) => {
        console.warn(`Download job ${job.id} dropped after ${attempts} failed attempts`);
        removeJob(job.id);
        toast.error(t('externalAlbum.download.failed'));
      },
      prepare: async () => {
        await ensureDownloadDir();
        await cleanupStagingFiles();
      },
      concurrency: CONCURRENT_TRACK_DOWNLOADS,
      maxAttempts: MAX_JOB_ATTEMPTS,
    });
  }, [performDownloadTrack, removeJob, t, updateJobs]);

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

  const downloadTracks = useCallback(async (tracks: Song[]) => {
    const pending = tracks.filter(track =>
      !localPathMapRef.current.has(track.id)
    );
    if (!pending.length) return;
    await enqueueDownloadJob({
      id: `tracks:${Date.now()}`,
      type: 'track',
      tracks: pending,
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

  // The old success toast fired unconditionally — allSettled swallowed every
  // per-track rejection, so users saw "download complete" over an empty
  // downloads list. Verify what actually landed before claiming success.
  const toastCollectionResult = useCallback((tracks: Song[], label: string) => {
    const downloadedCount = tracks.filter(track => localPathMapRef.current.has(track.id)).length;
    if (downloadedCount === tracks.length) {
      toast.success(t('settings.downloaders.downloadComplete'));
    } else {
      console.warn(`${label} download incomplete: ${downloadedCount}/${tracks.length} tracks`);
      toast.error(t('externalAlbum.download.failed'));
    }
  }, [t]);

  const downloadAlbumById = useCallback(async (albumId: string, songs?: Song[]) => {
    const tracks = songs?.length
      ? songs
      : (await api.albums.get(albumId))?.songs ?? [];
    if (!tracks.length) return;

    try {
      await downloadCollection(albumId, 'album', tracks);
      toastCollectionResult(tracks, 'Album');
    } catch (error) {
      console.warn('Album download failed', error);
      toast.error(t('externalAlbum.download.failed'));
    }
  }, [api, downloadCollection, t, toastCollectionResult]);

  const downloadPlaylistById = useCallback(async (playlistId: string, songs?: Song[]) => {
    const tracks = songs?.length
      ? songs
      : (await api.playlists.get(playlistId))?.songs ?? [];
    if (!tracks.length) return;

    try {
      await downloadCollection(playlistId, 'playlist', tracks);
      toastCollectionResult(tracks, 'Playlist');
    } catch (error) {
      console.warn('Playlist download failed', error);
      toast.error(t('externalAlbum.download.failed'));
    }
  }, [api, downloadCollection, t, toastCollectionResult]);

  const downloadPlaylist = useCallback(
    (playlistId: string, tracks: Song[]) => downloadPlaylistById(playlistId, tracks),
    [downloadPlaylistById]
  );

  // Aborts in-flight transfers for tracks that no longer belong to any queued
  // job. Cancelled resumables resolve undefined in performDownloadTrack, so
  // nothing gets recorded and the staging file is cleaned up there.
  const cancelOrphanedActiveDownloads = useCallback(async (candidateTrackIds: Iterable<string>) => {
    const orphans = orphanedTrackIds(candidateTrackIds, jobsRef.current);
    await Promise.all(orphans.map(trackId => {
      const resumable = activeDownloadsRef.current.get(trackId);
      return resumable ? resumable.cancelAsync().catch(() => {}) : Promise.resolve();
    }));
  }, []);

  const deleteFiles = useCallback(async (tracks: LocalDownloadedTrackEntry[]) => {
    await Promise.all(tracks.map(track =>
      FileSystem.deleteAsync(track.localPath, { idempotent: true }).catch(() => {})
    ));
  }, []);

  const deleteDownloadedTrack = useCallback(async (trackId: string) => {
    const entry = state.tracks.find(track => track.trackId === trackId);
    if (entry) await deleteFiles([entry]);

    const removed = new Set([trackId]);
    updateTracks(tracks => tracksWithout(tracks, removed));
    updateCollections(collections => collectionsWithoutTracks(collections, removed));
  }, [deleteFiles, state.tracks, updateCollections, updateTracks]);

  const removeDownloadByCollectionId = useCallback(async (
    id: string,
    trackIds: string[],
    scope?: DownloadProviderScope,
  ) => {
    const tracksToDelete = tracksInCollectionRemoval(state.tracks, trackIds, scope);
    await deleteFiles(tracksToDelete);

    const removed = new Set(tracksToDelete.map(track => track.trackId));
    updateTracks(tracks => tracksWithout(tracks, removed));
    updateCollections(collections => collections.filter(collection => collection.id !== id));
    updateJobs(jobs => jobs.filter(job => !jobMatchesCollectionId(job, id)));
    await cancelOrphanedActiveDownloads(trackIds);
  }, [cancelOrphanedActiveDownloads, deleteFiles, state.tracks, updateCollections, updateJobs, updateTracks]);

  const clearDownloadsForProvider = useCallback(async (scope?: DownloadProviderScope) => {
    const tracksToDelete = tracksInScope(state.tracks, scope);
    await deleteFiles(tracksToDelete);

    const removed = new Set(tracksToDelete.map(track => track.trackId));
    updateTracks(tracks => tracksWithout(tracks, removed));
    updateCollections(collections => collectionsWithoutTracks(collections, removed));
    updateJobs(jobs => jobsOutsideScope(jobs, scope));
  }, [deleteFiles, state.tracks, updateCollections, updateJobs, updateTracks]);

  const clearAllDownloads = useCallback(async () => {
    await deleteFiles(state.tracks);
    updateTracks(() => []);
    updateCollections(() => []);
    updateJobs(() => []);
  }, [deleteFiles, state.tracks, updateCollections, updateJobs, updateTracks]);

  const cancelDownload = useCallback(async (downloadId: string) => {
    const cancelledTrackIds = trackIdsOfJobs(
      jobsRef.current.filter(job => jobMatchesDownloadId(job, downloadId))
    );

    updateJobs(jobs => jobs.filter(job => !jobMatchesDownloadId(job, downloadId)));
    await cancelOrphanedActiveDownloads(cancelledTrackIds);
  }, [cancelOrphanedActiveDownloads, updateJobs]);

  const cancelCollectionDownloads = useCallback(async (collectionId: string) => {
    const cancelledTrackIds = trackIdsOfJobs(
      jobsRef.current.filter(job => jobMatchesCollectionId(job, collectionId))
    );

    updateJobs(jobs => jobs.filter(job => !jobMatchesCollectionId(job, collectionId)));
    await cancelOrphanedActiveDownloads(cancelledTrackIds);
  }, [cancelOrphanedActiveDownloads, updateJobs]);

  const cancelDownloadAll = useCallback(async () => {
    updateJobs(() => []);
    await cancelOrphanedActiveDownloads(activeDownloadsRef.current.keys());
  }, [cancelOrphanedActiveDownloads, updateJobs]);

  const resumeDownload = useCallback(async (downloadId: string) => {
    const hasJob = jobsRef.current.some(job => jobMatchesDownloadId(job, downloadId));
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
    if (!jobRunnerRef.current.isRunning()) {
      cleanupStagingFiles().catch(() => {});
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

  // Coming back onto WiFi — or turning the restriction off — is the other way
  // a held queue becomes runnable, and neither goes through AppState.
  useEffect(() => {
    if (wifiOnly && networkType === 'cellular') return;
    if (jobsRef.current.length > 0) void processDownloadQueue();
  }, [wifiOnly, networkType, processDownloadQueue]);

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
    downloadTracks,
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
    downloadTracks,
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
      availableBytes: await FileSystem.getFreeDiskStorageAsync().catch(() => undefined),
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
        <DownloadProgressContext.Provider value={downloadProgress}>
          {children}
        </DownloadProgressContext.Provider>
      </DownloadStateContext.Provider>
    </DownloadActionsContext.Provider>
  );
};
