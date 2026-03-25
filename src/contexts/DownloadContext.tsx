import React, {
    createContext,
    useContext,
    ReactNode,
} from 'react';
import {
    DownloadProviderScope,
} from '@/utils/downloads/provider';

type DownloadContextType = {
    configure: (config: Record<string, unknown>) => void;
    downloadTrack: (track: any, playlistId?: string) => Promise<string | void>;
    downloadPlaylist: (playlistId: string, tracks: any[]) => Promise<void>;
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
};

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const useDownload = (): DownloadContextType => {
    const ctx = useContext(DownloadContext);
    if (!ctx) throw new Error('useDownload must be used within DownloadProvider');
    return ctx;
};

export const DownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const value: DownloadContextType = {
        configure: () => {},
        downloadTrack: async () => {},
        downloadPlaylist: async () => {},
        pauseDownload: async () => {},
        resumeDownload: async () => {},
        cancelDownload: async () => {},
        isTrackDownloaded: () => false,
        getAllDownloadedTracks: () => [],
        deleteDownloadedTrack: async () => {},
        getStorageInfo: async () => null,
        setPlaybackSourcePreference: () => {},
        downloadAlbumById: async () => {},
        downloadPlaylistById: async () => {},
        isTrackDownloading: () => false,
        getCollectionDownloadState: () => ({ isDownloaded: false, isDownloading: false }),
        cancelCollectionDownloads: async () => {},
        removeDownloadByCollectionId: async () => {},
        cancelDownloadAll: async () => {},
        clearDownloadsForProvider: async () => {},
        clearAllDownloads: async () => {},
        downloadStateVersion: 0,
    };

    return (
        <DownloadContext.Provider value={value}>
            {children}
        </DownloadContext.Provider>
    );
};
