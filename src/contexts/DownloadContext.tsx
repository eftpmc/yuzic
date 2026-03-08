import React, {
    createContext,
    useContext,
    useEffect,
    useCallback,
    useMemo,
    useState,
    ReactNode,
} from 'react';
import {
    DownloadManager,
    useDownloadedTracks,
    useDownloadProgress,
} from 'react-native-nitro-player';
import type { TrackItem } from 'react-native-nitro-player';
import { Song, Playlist, Album } from '@/types';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useSelector } from 'react-redux';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { staleTime } from '@/constants/staleTime';
import { buildCover } from '@/utils/builders/buildCover';
import {
    DownloadProviderScope,
    doesTrackMatchProviderScope,
    normalizeServerId,
    normalizeServerType,
} from '@/utils/downloads/provider';

type DownloadContextType = {
    configure: (config: Record<string, unknown>) => void;
    downloadTrack: (track: TrackItem, playlistId?: string) => Promise<string | void>;
    downloadPlaylist: (playlistId: string, tracks: TrackItem[]) => Promise<void>;
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

function songToTrackItem(
    song: Song,
    opts?: { serverId?: string; serverType?: string | null }
): TrackItem {
    const cover = buildCover(song.cover, 'grid') || undefined;
    return {
        id: song.id,
        title: song.title,
        artist: song.artist,
        album: '',
        duration: parseFloat(song.duration || '0'),
        url: song.streamUrl,
        artwork: cover ?? null,
        extraPayload: {
            artistId: song.artistId,
            albumId: song.albumId,
            serverId: song.sourceServerId ?? opts?.serverId ?? '',
            serverType: song.sourceServerType ?? opts?.serverType ?? '',
            coverKind: song.cover?.kind ?? '',
        },
    };
}

function dedupeDownloadTrackItems(trackItems: TrackItem[]): TrackItem[] {
    const deduped = new Map<string, TrackItem>();
    for (const item of trackItems) {
        const trackId = String(item.id ?? '').trim();
        const url = String(item.url ?? '').trim();
        if (!trackId || !url) continue;
        if (!deduped.has(trackId)) deduped.set(trackId, item);
    }
    return [...deduped.values()];
}

export const DownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const api = useApi();
    const activeServer = useSelector(selectActiveServer);

    const {
        isTrackDownloaded: isNativeTrackDownloaded,
        downloadedTracks,
        refresh: refreshDownloadedTracks,
    } = useDownloadedTracks();
    const { progressList } = useDownloadProgress({ activeOnly: true });
    const [downloadStateVersion, setDownloadStateVersion] = useState(0);

    const bumpDownloadStateVersion = useCallback(() => {
        setDownloadStateVersion((v) => v + 1);
    }, []);

    const normalizeTrackId = useCallback((value: unknown): string => {
        return String(value ?? '').trim();
    }, []);

    const refreshDownloadState = useCallback(async () => {
        try {
            await refreshDownloadedTracks?.();
        } catch {
            // ignore and continue with local version bump
        }
        bumpDownloadStateVersion();
    }, [refreshDownloadedTracks, bumpDownloadStateVersion]);

    const configure = useCallback((config: Record<string, unknown>) => {
        DownloadManager.configure(config as any);
    }, []);

    const setPlaybackSourcePreference = useCallback((pref: 'auto' | 'download' | 'network') => {
        DownloadManager.setPlaybackSourcePreference(pref);
    }, []);

    useEffect(() => {
        configure({
            maxConcurrentDownloads: 1,
            backgroundDownloadsEnabled: false,
            downloadArtwork: true,
        });
        setPlaybackSourcePreference('download');
    }, [configure, setPlaybackSourcePreference]);

    const downloadTrack = useCallback(async (track: TrackItem, playlistId?: string) => {
        const downloadId = await DownloadManager.downloadTrack(track, playlistId);
        await refreshDownloadState();
        return downloadId;
    }, [refreshDownloadState]);

    const downloadPlaylist = useCallback(async (playlistId: string, tracks: TrackItem[]) => {
        const validTracks = dedupeDownloadTrackItems(tracks);
        if (!validTracks.length) return;
        await DownloadManager.downloadPlaylist(playlistId, validTracks);
        await refreshDownloadState();
    }, [refreshDownloadState]);

    const pauseDownload = useCallback(async (downloadId: string) => {
        await DownloadManager.pauseDownload(downloadId);
        bumpDownloadStateVersion();
    }, [bumpDownloadStateVersion]);

    const resumeDownload = useCallback(async (downloadId: string) => {
        await DownloadManager.resumeDownload(downloadId);
        bumpDownloadStateVersion();
    }, [bumpDownloadStateVersion]);

    const cancelDownload = useCallback(async (downloadId: string) => {
        await DownloadManager.cancelDownload(downloadId);
        await refreshDownloadState();
    }, [refreshDownloadState]);

    const downloadAlbumById = useCallback(async (albumId: string) => {
        let album = queryClient.getQueryData<Album>([
            QueryKeys.Album,
            activeServer?.id,
            albumId,
        ]);

        if (!album) {
            album = await queryClient.fetchQuery({
                queryKey: [QueryKeys.Album, activeServer?.id, albumId],
                queryFn: () => api.albums.get(albumId),
                staleTime: staleTime.albums,
                networkMode: 'offlineFirst',
            });
        }

        if (!album) return;

        const trackItems = dedupeDownloadTrackItems(album.songs.map(song => songToTrackItem(song, {
            serverId: activeServer?.id,
            serverType: activeServer?.type ?? null,
        }))).filter(item => !isNativeTrackDownloaded(String(item.id)));
        if (!trackItems.length) return;
        await downloadPlaylist(albumId, trackItems);
    }, [queryClient, activeServer?.id, activeServer?.type, api, isNativeTrackDownloaded, downloadPlaylist]);

    const downloadPlaylistById = useCallback(async (playlistId: string) => {
        let playlist = queryClient.getQueryData<Playlist>([
            QueryKeys.Playlist,
            activeServer?.id,
            playlistId,
        ]);

        if (!playlist) {
            playlist = await queryClient.fetchQuery({
                queryKey: [QueryKeys.Playlist, activeServer?.id, playlistId],
                queryFn: () => api.playlists.get(playlistId),
                staleTime: staleTime.playlists,
                networkMode: 'offlineFirst',
            });
        }

        if (!playlist) return;

        const trackItems = dedupeDownloadTrackItems(playlist.songs.map(song => songToTrackItem(song, {
            serverId: activeServer?.id,
            serverType: activeServer?.type ?? null,
        }))).filter(item => !isNativeTrackDownloaded(String(item.id)));
        if (!trackItems.length) return;
        await downloadPlaylist(playlistId, trackItems);
    }, [queryClient, activeServer?.id, activeServer?.type, api, isNativeTrackDownloaded, downloadPlaylist]);

    const isTrackDownloaded = useCallback((trackId: string) => {
        const normalizedTrackId = normalizeTrackId(trackId);
        if (!normalizedTrackId) return false;
        return isNativeTrackDownloaded(normalizedTrackId);
    }, [isNativeTrackDownloaded, normalizeTrackId]);

    const getActiveDownloads = useCallback(() => {
        return DownloadManager.getActiveDownloads() ?? [];
    }, []);

    const getDownloadTaskTrackId = useCallback((task: any): string => {
        return String(
            task?.trackId ??
            task?.originalTrack?.id ??
            task?.track?.id ??
            ''
        ).trim();
    }, []);

    const activeDownloadingTrackIds = useMemo(() => {
        const ids = new Set<string>();
        const activeTasks = getActiveDownloads();
        const activeDownloadIds = new Set<string>();

        for (const task of activeTasks) {
            const downloadId = String(task?.downloadId ?? '').trim();
            if (downloadId) activeDownloadIds.add(downloadId);
            const taskTrackId = getDownloadTaskTrackId(task);
            if (taskTrackId) ids.add(taskTrackId);
        }

        for (const progress of progressList) {
            const progressDownloadId = String(progress?.downloadId ?? '').trim();
            if (!progressDownloadId || !activeDownloadIds.has(progressDownloadId)) continue;
            const task = DownloadManager.getDownloadTask(progress.downloadId);
            const taskTrackId = getDownloadTaskTrackId(task);
            if (taskTrackId) ids.add(taskTrackId);
        }

        return ids;
    }, [progressList, getActiveDownloads, getDownloadTaskTrackId]);

    const isTrackDownloading = useCallback((trackId: string) => {
        if (!trackId) return false;
        return activeDownloadingTrackIds.has(String(trackId));
    }, [activeDownloadingTrackIds]);

    const getCollectionDownloadState = useCallback((trackIds: string[]) => {
        const normalized = [...new Set(trackIds.map(id => normalizeTrackId(id)).filter(Boolean))];
        if (!normalized.length) {
            return {
                isDownloaded: false,
                isDownloading: false,
            };
        }

        const isDownloaded = normalized.every((id) => {
            return isNativeTrackDownloaded(id);
        });
        const isDownloading = !isDownloaded && normalized.some((id) => activeDownloadingTrackIds.has(id));

        return {
            isDownloaded,
            isDownloading,
        };
    }, [isNativeTrackDownloaded, activeDownloadingTrackIds, normalizeTrackId]);

    const cancelCollectionDownloads = useCallback(async (collectionId: string) => {
        const activeTasks = getActiveDownloads();
        let cancelled = false;
        for (const task of activeTasks) {
            if (task.playlistId === collectionId) {
                await DownloadManager.cancelDownload(task.downloadId);
                cancelled = true;
            }
        }
        if (cancelled) await refreshDownloadState();
    }, [getActiveDownloads, refreshDownloadState]);

    const removeDownloadByCollectionId = useCallback(async (
        id: string,
        trackIds: string[],
        scope?: DownloadProviderScope
    ) => {
        const normalizedTrackIds = [...new Set(
            trackIds
                .map(trackId => String(trackId ?? '').trim())
                .filter(Boolean)
        )];
        const scopeServerId = normalizeServerId(scope?.serverId);
        const scopeServerType = normalizeServerType(scope?.serverType);

        const activeTasks = getActiveDownloads();
        let changed = false;
        for (const task of activeTasks) {
            if (task.playlistId === id) {
                const taskServerId = normalizeServerId((task as any)?.serverId);
                const taskServerType = normalizeServerType((task as any)?.serverType);
                if (scopeServerId && taskServerId && taskServerId !== scopeServerId) continue;
                if (scopeServerType && taskServerType && taskServerType !== scopeServerType) continue;
                await DownloadManager.cancelDownload(task.downloadId);
                changed = true;
            }
        }

        for (const trackId of normalizedTrackIds) {
            if (!trackId) continue;
            const isDownloaded = isNativeTrackDownloaded(trackId);
            if (!isDownloaded) continue;
            if (scope) {
                const track = (downloadedTracks as any[]).find(
                    item => String(item?.trackId ?? item?.originalTrack?.id ?? '') === trackId
                );
                if (!track || !doesTrackMatchProviderScope(track, scope)) continue;
            }
            await DownloadManager.deleteDownloadedTrack(trackId);
            changed = true;
        }
        if (changed) {
            await refreshDownloadState();
        }
    }, [downloadedTracks, getActiveDownloads, isNativeTrackDownloaded, refreshDownloadState]);

    const cancelDownloadAll = useCallback(async () => {
        await DownloadManager.cancelAllDownloads();
        await refreshDownloadState();
    }, [refreshDownloadState]);

    const clearDownloadsForProvider = useCallback(async (scope?: DownloadProviderScope) => {
        const scopeServerId = normalizeServerId(scope?.serverId);
        const scopeServerType = normalizeServerType(scope?.serverType);
        const activeTasks = getActiveDownloads();
        let changed = false;
        for (const task of activeTasks) {
            const taskServerId = normalizeServerId((task as any)?.serverId);
            const taskServerType = normalizeServerType((task as any)?.serverType);
            if (scopeServerId && (!taskServerId || taskServerId !== scopeServerId)) continue;
            if (!scopeServerId && scopeServerType && (!taskServerType || taskServerType !== scopeServerType)) continue;
            await DownloadManager.cancelDownload(task.downloadId);
            changed = true;
        }

        for (const track of downloadedTracks as any[]) {
            if (!doesTrackMatchProviderScope(track, scope)) continue;
            const trackId = String(track?.trackId ?? track?.originalTrack?.id ?? '');
            if (!trackId) continue;
            if (isNativeTrackDownloaded(trackId)) {
                await DownloadManager.deleteDownloadedTrack(trackId);
                changed = true;
            }
        }
        if (changed) {
            await refreshDownloadState();
        }
    }, [downloadedTracks, getActiveDownloads, isNativeTrackDownloaded, refreshDownloadState]);

    const clearAllDownloads = useCallback(async () => {
        await DownloadManager.cancelAllDownloads();
        await DownloadManager.deleteAllDownloads();
        await refreshDownloadState();
    }, [refreshDownloadState]);

    const getAllDownloadedTracks = useCallback(() => {
        return (downloadedTracks ?? []) as any[];
    }, [downloadedTracks]);

    const deleteDownloadedTrack = useCallback(async (trackId: string) => {
        if (!trackId) return;
        await DownloadManager.deleteDownloadedTrack(trackId);
        await refreshDownloadState();
    }, [refreshDownloadState]);

    const getStorageInfo = useCallback(async () => {
        const getter = (DownloadManager as any)?.getStorageInfo;
        if (typeof getter === 'function') {
            return getter();
        }
        return null;
    }, []);

    return (
        <DownloadContext.Provider
            value={{
                configure,
                downloadTrack,
                downloadPlaylist,
                pauseDownload,
                resumeDownload,
                cancelDownload,
                getAllDownloadedTracks,
                deleteDownloadedTrack,
                getStorageInfo,
                setPlaybackSourcePreference,
                downloadAlbumById,
                downloadPlaylistById,
                isTrackDownloaded,
                isTrackDownloading,
                getCollectionDownloadState,
                cancelCollectionDownloads,
                removeDownloadByCollectionId,
                cancelDownloadAll,
                clearDownloadsForProvider,
                clearAllDownloads,
                downloadStateVersion,
            }}
        >
            {children}
        </DownloadContext.Provider>
    );
};
