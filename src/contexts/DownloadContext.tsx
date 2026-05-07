import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import { Song } from '@/types';
import { DownloadProviderScope } from '@/utils/downloads/provider';
import { DownloadedCollectionEntry } from '@/utils/downloads/downloadStore';

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

export const useDownload = (): DownloadContextType => {
  const ctx = useContext(DownloadContext);
  if (!ctx) throw new Error('useDownload must be used within DownloadProvider');
  return ctx;
};

export const DownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const noopPromise = useCallback(async () => {}, []);
  const emptyTracks = useMemo<DownloadedTrack[]>(() => [], []);
  const emptyCollections = useMemo<DownloadedCollectionEntry[]>(() => [], []);

  const value = useMemo<DownloadContextType>(() => ({
    configure: () => {},
    downloadTrack: noopPromise,
    downloadPlaylist: noopPromise,
    pauseDownload: noopPromise,
    resumeDownload: noopPromise,
    cancelDownload: noopPromise,
    isTrackDownloaded: () => false,
    getAllDownloadedTracks: () => emptyTracks,
    deleteDownloadedTrack: noopPromise,
    getStorageInfo: async () => ({
      totalBytes: 0,
      downloadedTracks: 0,
    }),
    setPlaybackSourcePreference: () => {},
    downloadAlbumById: noopPromise,
    downloadPlaylistById: noopPromise,
    isTrackDownloading: () => false,
    getCollectionDownloadState: () => ({
      isDownloaded: false,
      isDownloading: false,
    }),
    cancelCollectionDownloads: noopPromise,
    removeDownloadByCollectionId: noopPromise,
    cancelDownloadAll: noopPromise,
    clearDownloadsForProvider: noopPromise,
    clearAllDownloads: noopPromise,
    downloadStateVersion: 0,
    downloadedTracks: emptyTracks,
    getLocalPath: () => null,
    getSongLocalUri: async () => null,
    getAllDownloadedCollections: () => emptyCollections,
    totalDownloadedBytes: 0,
    downloadedTrackCount: 0,
  }), [emptyCollections, emptyTracks, noopPromise]);

  return (
    <DownloadContext.Provider value={value}>
      {children}
    </DownloadContext.Provider>
  );
};
