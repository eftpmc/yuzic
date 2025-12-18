import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    ReactNode,
} from 'react';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';
import store from '@/utils/redux/store';
import { useLibrary } from '@/contexts/LibraryContext';
import { useSettings } from '@/contexts/SettingsContext';
import { selectAlbumList, selectPlaylistList } from '@/utils/redux/librarySelectors';
import { Album, Playlist, Song } from '@/types';

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

    markedAlbums: Set<string>;
    markedPlaylists: Set<string>;
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
    const { audioQuality } = useSettings();
    const { getAlbum, getPlaylist } = useLibrary();

    const albums = useSelector(selectAlbumList);
    const playlists = useSelector(selectPlaylistList);

    const [markedAlbums, setMarkedAlbums] = useState<Set<string>>(new Set());
    const [markedPlaylists, setMarkedPlaylists] = useState<Set<string>>(new Set());
    const [downloadedSongs, setDownloadedSongs] = useState<Record<string, boolean>>({});
    const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
    const [downloadedSize, setDownloadedSize] = useState(0);

    const cancelledIds = useRef<Set<string>>(new Set());
    const isCancellingAll = useRef(false);
    const hasResumedRef = useRef(false);

    const STORAGE_KEYS = {
        albums: 'markedAlbums',
        playlists: 'markedPlaylists',
    };

    const resolveAlbum = async (albumId: string): Promise<Album | null> => {
        let album = store.getState().library.albumsById[albumId];
        if (!album?.songs) {
            await getAlbum(albumId);
            album = store.getState().library.albumsById[albumId];
        }
        return album?.songs ? album : null;
    };

    const resolvePlaylist = async (playlistId: string): Promise<Playlist | null> => {
        let playlist = store.getState().library.playlistsById[playlistId];
        if (!playlist?.songs) {
            await getPlaylist(playlistId);
            playlist = store.getState().library.playlistsById[playlistId];
        }
        return playlist?.songs ? playlist : null;
    };

    useEffect(() => {
        const loadState = async () => {
            try {
                const dirInfo = await FileSystem.getInfoAsync(SONGS_DIR);
                if (dirInfo.exists) {
                    const files = await FileSystem.readDirectoryAsync(SONGS_DIR);
                    const map: Record<string, boolean> = {};
                    let size = 0;

                    for (const file of files) {
                        const id = file.replace('.mp3', '');
                        map[id] = true;
                        const info = await FileSystem.getInfoAsync(`${SONGS_DIR}/${file}`);
                        if (info.exists && info.size) size += info.size;
                    }

                    setDownloadedSongs(map);
                    setDownloadedSize(size);
                }

                const albumJson = await AsyncStorage.getItem(STORAGE_KEYS.albums);
                const playlistJson = await AsyncStorage.getItem(STORAGE_KEYS.playlists);

                if (albumJson) setMarkedAlbums(new Set(JSON.parse(albumJson)));
                if (playlistJson) setMarkedPlaylists(new Set(JSON.parse(playlistJson)));
            } catch (e) {
                console.error('Failed to load downloads:', e);
            }
        };

        loadState();
    }, []);

    const saveMarkedAlbums = async (ids: Set<string>) =>
        AsyncStorage.setItem(STORAGE_KEYS.albums, JSON.stringify([...ids]));

    const saveMarkedPlaylists = async (ids: Set<string>) =>
        AsyncStorage.setItem(STORAGE_KEYS.playlists, JSON.stringify([...ids]));

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
                if (info.size) setDownloadedSize(s => s + info.size);
                resolve();
            };
            reader.readAsDataURL(blob);
        });

        setDownloadedSongs(s => ({ ...s, [song.id]: true }));
    };

    const downloadAlbumById = async (albumId: string) => {
        if (cancelledIds.current.has(albumId)) return;

        const album = await resolveAlbum(albumId);
        if (!album) return;

        setMarkedAlbums(s => {
            const n = new Set(s);
            n.add(albumId);
            saveMarkedAlbums(n);
            return n;
        });

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

        const playlist = await resolvePlaylist(playlistId);
        if (!playlist) return;

        setMarkedPlaylists(s => {
            const n = new Set(s);
            n.add(playlistId);
            saveMarkedPlaylists(n);
            return n;
        });

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

    const isSongDownloaded = (songId: string) => !!downloadedSongs[songId];

    const isAlbumDownloaded = (albumId: string) => {
        const album = store.getState().library.albumsById[albumId];
        return !!album?.songs?.every(s => isSongDownloaded(s.id));
    };

    const isPlaylistDownloaded = (playlistId: string) => {
        const playlist = store.getState().library.playlistsById[playlistId];
        return !!playlist?.songs?.every(s => isSongDownloaded(s.id));
    };

    const isDownloadingAlbum = (albumId: string) => downloadingIds.includes(albumId);
    const isDownloadingPlaylist = (playlistId: string) => downloadingIds.includes(playlistId);

    const cancelDownload = (id: string) => {
        cancelledIds.current.add(id);
        setDownloadingIds(d => d.filter(x => x !== id));
    };

    const cancelDownloadAll = () => {
        isCancellingAll.current = true;
        albums.forEach(a => cancelledIds.current.add(a.id));
        playlists.forEach(p => cancelledIds.current.add(p.id));
        setDownloadingIds([]);
    };

    const clearAllDownloads = async () => {
        await FileSystem.deleteAsync(SONGS_DIR, { idempotent: true });
        await AsyncStorage.multiRemove([STORAGE_KEYS.albums, STORAGE_KEYS.playlists]);
        setDownloadedSongs({});
        setMarkedAlbums(new Set());
        setMarkedPlaylists(new Set());
        setDownloadedSize(0);
    };

    const getDownloadedSongsCount = () => Object.keys(downloadedSongs).length;

    const getFormattedDownloadSize = () =>
        `${(downloadedSize / (1024 * 1024)).toFixed(2)} MB`;

    useEffect(() => {
        if (hasResumedRef.current) return;
        if (!albums.length || !playlists.length) return;

        hasResumedRef.current = true;

        markedAlbums.forEach(downloadAlbumById);
        markedPlaylists.forEach(downloadPlaylistById);
    }, [albums, playlists]);

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