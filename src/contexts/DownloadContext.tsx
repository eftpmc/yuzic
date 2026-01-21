import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    ReactNode,
} from 'react';
import * as FileSystem from 'expo-file-system';
import { RootState } from '@/utils/redux/store';
import { Song, Playlist, Album } from '@/types';
import { useDispatch, useSelector } from 'react-redux';
import {
    markAlbum,
    markPlaylist,
    clearAllMarked,
} from '@/utils/redux/slices/downloadsSlice';
import { selectAudioQuality } from '@/utils/redux/selectors/settingsSelectors';
import { useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/api';
import { QueryKeys } from '@/enums/queryKeys';
import { staleTime } from '@/constants/staleTime';
import { useAlbums } from '@/hooks/albums';
import { usePlaylists } from '@/hooks/playlists';

type DownloadContextType = {
    downloadAlbumById: (albumId: string) => Promise<void>;
    downloadPlaylistById: (playlistId: string) => Promise<void>;

    isAlbumDownloaded: (albumId: string) => boolean;
    isPlaylistDownloaded: (playlistId: string) => boolean;

    isDownloadingAlbum: (albumId: string) => boolean;
    isDownloadingPlaylist: (playlistId: string) => boolean;

    getSongLocalUri: (songId: string) => Promise<string | null>;
    isSongDownloaded: (songId: string) => boolean;

    downloadingIds: string[];
    getDownloadedSongsCount: () => number;

    clearAllDownloads: () => Promise<void>;
    cancelDownload: (id: string) => void;
    cancelDownloadAll: () => void;

    downloadedSize: number;
    getFormattedDownloadSize: () => string;

    markedAlbums: string[];
    markedPlaylists: string[];
};

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const useDownload = (): DownloadContextType => {
    const ctx = useContext(DownloadContext);
    if (!ctx) throw new Error('useDownload must be used within DownloadProvider');
    return ctx;
};

const SONGS_DIR = `${FileSystem.documentDirectory}songs`;
const getSongFilePath = (songId: string) => `${SONGS_DIR}/${songId}.mp3`;

export const DownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const { albums } = useAlbums();
    const { playlists } = usePlaylists();
    const api = useApi();
    const dispatch = useDispatch();

    const audioQuality = useSelector(selectAudioQuality);

    const markedAlbums = useSelector(
        (state: RootState) => state.downloads.markedAlbums
    );

    const markedPlaylists = useSelector(
        (state: RootState) => state.downloads.markedPlaylists
    );

    const [downloadedSongs, setDownloadedSongs] = useState<Record<string, boolean>>(
        {}
    );
    const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
    const [downloadedSize, setDownloadedSize] = useState(0);

    const cancelledIds = useRef<Set<string>>(new Set());
    const hasResumedRef = useRef(false);

    useEffect(() => {
        const scanFiles = async () => {
            const dirInfo = await FileSystem.getInfoAsync(SONGS_DIR);
            if (!dirInfo.exists) return;

            const files = await FileSystem.readDirectoryAsync(SONGS_DIR);
            const map: Record<string, boolean> = {};
            let size = 0;

            for (const file of files) {
                const id = file.replace('.mp3', '');
                map[id] = true;

                const info = await FileSystem.getInfoAsync(`${SONGS_DIR}/${file}`);
                if (info.exists && typeof info.size === 'number') {
                    size += info.size;
                }
            }

            setDownloadedSongs(map);
            setDownloadedSize(size);
        };

        scanFiles().catch(console.error);
    }, []);

    const uploadAndStoreSong = async (song: Song) => {
        const tempPath = FileSystem.cacheDirectory + `${song.id}-raw.mp3`;
        const finalPath = getSongFilePath(song.id);

        if ((await FileSystem.getInfoAsync(finalPath)).exists) return;

        const res = await FileSystem.downloadAsync(song.streamUrl, tempPath);

        const formData = new FormData();
        formData.append('audio', {
            uri: res.uri,
            name: `${song.id}.mp3`,
            type: 'audio/mpeg',
        } as any);

        const response = await fetch(
            `https://rawarr-server-af0092d911f6.herokuapp.com/api/upload/upload-audio?quality=${audioQuality}`,
            { method: 'POST', body: formData }
        );

        if (!response.ok) throw new Error('Transcode failed');

        const blob = await response.blob();
        const reader = new FileReader();

        await new Promise<void>((resolve) => {
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                await FileSystem.writeAsStringAsync(finalPath, base64, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                const info = await FileSystem.getInfoAsync(finalPath);

                if (info.exists && typeof info.size === 'number') {
                    setDownloadedSize(s => s + info.size);
                }

                resolve();
            };
            reader.readAsDataURL(blob);
        });

        setDownloadedSongs((s) => ({ ...s, [song.id]: true }));
    };

    const downloadAlbumById = async (albumId: string) => {
        if (cancelledIds.current.has(albumId)) return;

        const album: Album = await queryClient.fetchQuery({
            queryKey: [QueryKeys.Album, albumId],
            queryFn: () => api.albums.get(albumId),
            staleTime: staleTime.albums,
        });

        dispatch(markAlbum(albumId));
        setDownloadingIds(d => [...d, albumId]);

        try {
            await FileSystem.makeDirectoryAsync(SONGS_DIR, { intermediates: true });

            for (const song of album.songs) {
                if (cancelledIds.current.has(albumId)) break;
                await uploadAndStoreSong(song);
            }
        } finally {
            setDownloadingIds(d => d.filter(id => id !== albumId));
            cancelledIds.current.delete(albumId);
        }
    };

    const downloadPlaylistById = async (playlistId: string) => {
        if (cancelledIds.current.has(playlistId)) return;

        const playlist: Playlist = await queryClient.fetchQuery({
            queryKey: [QueryKeys.Playlist, playlistId],
            queryFn: () => api.playlists.get(playlistId),
            staleTime: staleTime.playlists,
        });

        dispatch(markPlaylist(playlistId));
        setDownloadingIds(d => [...d, playlistId]);

        try {
            await FileSystem.makeDirectoryAsync(SONGS_DIR, { intermediates: true });

            for (const song of playlist.songs) {
                if (cancelledIds.current.has(playlistId)) break;
                await uploadAndStoreSong(song);
            }
        } finally {
            setDownloadingIds(d => d.filter(id => id !== playlistId));
            cancelledIds.current.delete(playlistId);
        }
    };

    /* ───────────────────────────────
       Helpers
    ─────────────────────────────── */

    const isSongDownloaded = (songId: string) => !!downloadedSongs[songId];

    const isAlbumDownloaded = (albumId: string) => {
        const album = queryClient.getQueryData<Album>(['album', albumId]);
        return !!album?.songs.every(s => isSongDownloaded(s.id));
    };

    const isPlaylistDownloaded = (playlistId: string) => {
        const playlist = queryClient.getQueryData<Playlist>(['playlist', playlistId]);
        return !!playlist?.songs.every(s => isSongDownloaded(s.id));
    };

    const isDownloadingAlbum = (albumId: string) =>
        downloadingIds.includes(albumId);

    const isDownloadingPlaylist = (playlistId: string) =>
        downloadingIds.includes(playlistId);

    const cancelDownload = (id: string) => {
        cancelledIds.current.add(id);
        setDownloadingIds((d) => d.filter((x) => x !== id));
    };

    const cancelDownloadAll = () => {
        albums.forEach((a) => cancelledIds.current.add(a.id));
        playlists.forEach((p) => cancelledIds.current.add(p.id));
        setDownloadingIds([]);
    };

    const clearAllDownloads = async () => {
        await FileSystem.deleteAsync(SONGS_DIR, { idempotent: true });
        dispatch(clearAllMarked());
        setDownloadedSongs({});
        setDownloadedSize(0);
    };

    const getDownloadedSongsCount = () =>
        Object.keys(downloadedSongs).length;

    const getFormattedDownloadSize = () =>
        `${(downloadedSize / (1024 * 1024)).toFixed(2)} MB`;

    useEffect(() => {
        if (hasResumedRef.current) return;
        if (!albums.length || !playlists.length) return;

        hasResumedRef.current = true;

        markedAlbums.forEach(downloadAlbumById);
        markedPlaylists.forEach(downloadPlaylistById);
    }, [albums, playlists, markedAlbums, markedPlaylists]);

    return (
        <DownloadContext.Provider
            value={{
                downloadAlbumById,
                downloadPlaylistById,
                isAlbumDownloaded,
                isPlaylistDownloaded,
                isDownloadingAlbum,
                isDownloadingPlaylist,
                getSongLocalUri: async (id) =>
                    (await FileSystem.getInfoAsync(getSongFilePath(id))).exists
                        ? getSongFilePath(id)
                        : null,
                isSongDownloaded,
                downloadingIds,
                getDownloadedSongsCount,
                clearAllDownloads,
                cancelDownload,
                cancelDownloadAll,
                downloadedSize,
                getFormattedDownloadSize,
                markedAlbums,
                markedPlaylists,
            }}
        >
            {children}
        </DownloadContext.Provider>
    );
};