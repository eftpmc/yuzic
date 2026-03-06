import React, {
    createContext,
    useContext,
    useEffect,
    useCallback,
    ReactNode,
} from 'react';
import {
    DownloadManager,
    useDownloadedTracks,
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
    downloadAlbumById: (albumId: string) => Promise<void>;
    downloadPlaylistById: (playlistId: string) => Promise<void>;

    isTrackDownloaded: (trackId: string) => boolean;
    isTrackDownloading: (trackId: string) => boolean;

    cancelDownload: (id: string) => Promise<void>;
    removeDownloadByCollectionId: (
        id: string,
        trackIds: string[],
        scope?: DownloadProviderScope
    ) => Promise<void>;
    cancelDownloadAll: () => Promise<void>;
    clearDownloadsForProvider: (scope?: DownloadProviderScope) => Promise<void>;
    clearAllDownloads: () => Promise<void>;
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

export const DownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const api = useApi();
    const activeServer = useSelector(selectActiveServer);

    const {
        isTrackDownloaded: isNativeTrackDownloaded,
        downloadedTracks,
    } = useDownloadedTracks();

    useEffect(() => {
        DownloadManager.configure({
            maxConcurrentDownloads: 3,
            backgroundDownloadsEnabled: true,
            downloadArtwork: true,
        });
        DownloadManager.setPlaybackSourcePreference('download');
    }, []);

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

        const trackItems = album.songs.map(song => songToTrackItem(song, {
            serverId: activeServer?.id,
            serverType: activeServer?.type ?? null,
        }));
        await DownloadManager.downloadPlaylist(albumId, trackItems);
    }, [queryClient, activeServer?.id, api]);

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

        const trackItems = playlist.songs.map(song => songToTrackItem(song, {
            serverId: activeServer?.id,
            serverType: activeServer?.type ?? null,
        }));
        await DownloadManager.downloadPlaylist(playlistId, trackItems);
    }, [queryClient, activeServer?.id, api]);

    const isTrackDownloaded = useCallback((trackId: string) => {
        return isNativeTrackDownloaded(trackId);
    }, [isNativeTrackDownloaded]);

    const isTrackDownloading = useCallback((trackId: string) => {
        const activeTasks = DownloadManager.getActiveDownloads();
        return activeTasks.some(task => task.trackId === trackId);
    }, []);

    const cancelDownload = useCallback(async (id: string) => {
        const activeTasks = DownloadManager.getActiveDownloads();
        for (const task of activeTasks) {
            if (task.playlistId === id) {
                await DownloadManager.cancelDownload(task.downloadId);
            }
        }
    }, []);

    const removeDownloadByCollectionId = useCallback(async (
        id: string,
        trackIds: string[],
        scope?: DownloadProviderScope
    ) => {
        const scopeServerId = normalizeServerId(scope?.serverId);
        const scopeServerType = normalizeServerType(scope?.serverType);

        // Cancel active downloads tied to this collection first.
        const activeTasks = DownloadManager.getActiveDownloads();
        for (const task of activeTasks) {
            if (task.playlistId === id) {
                const taskServerId = normalizeServerId((task as any)?.serverId);
                const taskServerType = normalizeServerType((task as any)?.serverType);

                // Only enforce task scoping when task metadata is present.
                if (scopeServerId && taskServerId && taskServerId !== scopeServerId) continue;
                if (scopeServerType && taskServerType && taskServerType !== scopeServerType) continue;
                await DownloadManager.cancelDownload(task.downloadId);
            }
        }

        // Delete local files for tracks that are already downloaded.
        const scopedTrackIds = new Set(
            (downloadedTracks as any[])
                .filter(track => doesTrackMatchProviderScope(track, scope))
                .map(track => String(track?.trackId ?? track?.originalTrack?.id ?? ''))
                .filter(Boolean)
        );

        for (const trackId of new Set(trackIds)) {
            if (!trackId) continue;
            if (!scopedTrackIds.has(trackId)) continue;
            if (isNativeTrackDownloaded(trackId)) {
                await DownloadManager.deleteDownloadedTrack(trackId);
            }
        }
    }, [downloadedTracks, isNativeTrackDownloaded]);

    const cancelDownloadAll = useCallback(async () => {
        await DownloadManager.cancelAllDownloads();
    }, []);

    const clearDownloadsForProvider = useCallback(async (scope?: DownloadProviderScope) => {
        const scopeServerId = normalizeServerId(scope?.serverId);
        const scopeServerType = normalizeServerType(scope?.serverType);

        const activeTasks = DownloadManager.getActiveDownloads();
        for (const task of activeTasks) {
            const taskServerId = normalizeServerId((task as any)?.serverId);
            const taskServerType = normalizeServerType((task as any)?.serverType);

            // If task metadata is unavailable, don't cancel blindly.
            if (scopeServerId && (!taskServerId || taskServerId !== scopeServerId)) continue;
            if (!scopeServerId && scopeServerType && (!taskServerType || taskServerType !== scopeServerType)) continue;
            await DownloadManager.cancelDownload(task.downloadId);
        }

        for (const track of downloadedTracks as any[]) {
            if (!doesTrackMatchProviderScope(track, scope)) continue;
            const trackId = String(track?.trackId ?? track?.originalTrack?.id ?? '');
            if (!trackId) continue;
            if (isNativeTrackDownloaded(trackId)) {
                await DownloadManager.deleteDownloadedTrack(trackId);
            }
        }
    }, [downloadedTracks, isNativeTrackDownloaded]);

    const clearAllDownloads = useCallback(async () => {
        await DownloadManager.cancelAllDownloads();
        await DownloadManager.deleteAllDownloads();
    }, []);

    return (
        <DownloadContext.Provider
            value={{
                downloadAlbumById,
                downloadPlaylistById,
                isTrackDownloaded,
                isTrackDownloading,
                cancelDownload,
                removeDownloadByCollectionId,
                cancelDownloadAll,
                clearDownloadsForProvider,
                clearAllDownloads,
            }}
        >
            {children}
        </DownloadContext.Provider>
    );
};
