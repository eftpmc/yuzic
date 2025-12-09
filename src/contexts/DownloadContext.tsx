import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    ReactNode,
} from 'react';
import * as FileSystem from 'expo-file-system';
import {useLibrary} from "@/contexts/LibraryContext";
import { useSettings } from '@/contexts/SettingsContext';
import { usePlaylists } from '@/contexts/PlaylistContext';
import { AlbumData, PlaylistData } from '@/types';
import AsyncStorage from "@react-native-async-storage/async-storage";

type DownloadContextType = {
    downloadAlbum: (album: AlbumData) => Promise<void>;
    downloadPlaylist: (playlist: PlaylistData) => Promise<void>;
    getSongLocalUri: (songId: string) => Promise<string | null>;
    isSongDownloaded: (songId: string) => boolean;
    isAlbumDownloaded: (album: AlbumData) => boolean;
    isDownloadingAlbum: (albumId: string) => boolean;
    isPlaylistDownloaded: (playlist: PlaylistData) => boolean;
    isDownloadingPlaylist: (playlistId: string) => boolean;
    downloadingIds: string[];
    getDownloadedSongsCount: () => number;
    clearAllDownloads: () => Promise<void>;
    cancelDownload: (albumId: string) => void;
    cancelDownloadAll: () => void;
    downloadAllAlbums: (albums: AlbumData[]) => Promise<void>;
    downloadedSize: number;
    getFormattedDownloadSize: () => string;
    markedAlbums: Set<string>;
    markedPlaylists: Set<string>;
};

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

export const useDownload = (): DownloadContextType => {
    const context = useContext(DownloadContext);
    if (!context) {
        throw new Error('useDownload must be used within a DownloadProvider');
    }
    return context;
};

const SONGS_DIR = `${FileSystem.documentDirectory}songs`;
const getSongFilePath = (songId: string): string => `${SONGS_DIR}/${songId}.mp3`;

export const DownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [markedAlbums, setMarkedAlbums] = useState<Set<string>>(new Set());
    const [markedPlaylists, setMarkedPlaylists] = useState<Set<string>>(new Set());

    const [hasLoadedDownloads, setHasLoadedDownloads] = useState(false);
    const [hasLoadedCollections, setHasLoadedCollections] = useState(false);
    const [downloadedSongs, setDownloadedSongs] = useState<Record<string, boolean>>({});
    const [downloadingIds, setDownloadingIds] = useState<string[]>([]);
    const [downloadedSize, setDownloadedSize] = useState<number>(0);
    const { audioQuality } = useSettings();
    const { albums } = useLibrary();
    const { playlists } = usePlaylists();

    const cancelledIds = useRef<Set<string>>(new Set());
    const downloadTasks = useRef<Map<string, FileSystem.DownloadResumable>>(new Map());

    const isCancellingAll = useRef(false);

    const STORAGE_KEYS = {
        albums: 'markedAlbums',
        playlists: 'markedPlaylists',
    };

    useEffect(() => {
        const loadDownloadedSongs = async () => {
            try {
                const dirInfo = await FileSystem.getInfoAsync(SONGS_DIR);
                if (!dirInfo.exists) return;

                const files = await FileSystem.readDirectoryAsync(SONGS_DIR);
                const map: Record<string, boolean> = {};
                let totalSize = 0;

                for (const fileName of files) {
                    const id = fileName.replace('.mp3', '');
                    map[id] = true;

                    const fileInfo = await FileSystem.getInfoAsync(`${SONGS_DIR}/${fileName}`);
                    if (fileInfo.exists && fileInfo.size != null) {
                        totalSize += fileInfo.size;
                    }
                }

                setDownloadedSongs(map);
                setDownloadedSize(totalSize);
            } catch (error) {
                console.error('Failed to load downloaded songs:', error);
            } finally {
                setHasLoadedDownloads(true);
            }
        };

        const loadMarkedCollections = async () => {
            try {
                const albumJson = await AsyncStorage.getItem(STORAGE_KEYS.albums);
                const playlistJson = await AsyncStorage.getItem(STORAGE_KEYS.playlists);

                if (albumJson) setMarkedAlbums(new Set(JSON.parse(albumJson)));
                if (playlistJson) setMarkedPlaylists(new Set(JSON.parse(playlistJson)));
            } catch (e) {
                console.error('Failed to load marked albums/playlists:', e);
            } finally {
                setHasLoadedCollections(true);
            }
        };

        loadDownloadedSongs();
        loadMarkedCollections();
    }, []);

    const saveMarkedAlbums = async (ids: Set<string>) => {
        await AsyncStorage.setItem(STORAGE_KEYS.albums, JSON.stringify([...ids]));
    };

    const saveMarkedPlaylists = async (ids: Set<string>) => {
        await AsyncStorage.setItem(STORAGE_KEYS.playlists, JSON.stringify([...ids]));
    };

    const downloadAlbum = async (album: AlbumData) => {
        if (isCancellingAll.current || cancelledIds.current.has(album.id)) {
            cancelledIds.current.delete(album.id);
            return;
        }
        setMarkedAlbums(prev => {
            const updated = new Set(prev);
            updated.add(album.id);
            saveMarkedAlbums(updated);
            return updated;
        });
        setDownloadingIds(prev => [...prev, album.id]);

        try {
            const dirInfo = await FileSystem.getInfoAsync(SONGS_DIR);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(SONGS_DIR, { intermediates: true });
            }

            for (const song of album.songs) {
                if (cancelledIds.current.has(album.id)) break;
                if (!song.streamUrl) continue;

                const tempPath = FileSystem.cacheDirectory + `${song.id}-raw.mp3`;
                const finalPath = getSongFilePath(song.id);
                const info = await FileSystem.getInfoAsync(finalPath);
                if (info.exists) continue;

                const resumable = FileSystem.createDownloadResumable(song.streamUrl, tempPath);
                await resumable.downloadAsync();

                await uploadToServer(song.id, tempPath, finalPath);
                await FileSystem.deleteAsync(tempPath, { idempotent: true });

                setDownloadedSongs(prev => ({ ...prev, [song.id]: true }));
            }

            console.log(`Album "${album.title}" downloaded.`);
        } catch (error) {
            console.error(`Failed to download album ${album.title}:`, error);
        } finally {
            downloadTasks.current.delete(album.id);
            setDownloadingIds(prev => prev.filter(id => id !== album.id));
            cancelledIds.current.delete(album.id);
        }
    };

    const downloadPlaylist = async (playlist: PlaylistData) => {
        if (isCancellingAll.current || cancelledIds.current.has(playlist.id)) {
            cancelledIds.current.delete(playlist.id);
            return;
        }
        setMarkedPlaylists(prev => {
            const updated = new Set(prev);
            updated.add(playlist.id);
            saveMarkedPlaylists(updated);
            return updated;
        });
        setDownloadingIds(prev => [...prev, playlist.id]);

        try {
            const dirInfo = await FileSystem.getInfoAsync(SONGS_DIR);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(SONGS_DIR, { intermediates: true });
            }

            for (const song of playlist.songs) {
                if (cancelledIds.current.has(playlist.id)) break;
                if (!song.streamUrl) continue;

                const tempPath = FileSystem.cacheDirectory + `${song.id}-raw.mp3`;
                const finalPath = getSongFilePath(song.id);
                const info = await FileSystem.getInfoAsync(finalPath);
                if (info.exists) continue;

                const resumable = FileSystem.createDownloadResumable(song.streamUrl, tempPath);
                await resumable.downloadAsync();

                await uploadToServer(song.id, tempPath, finalPath);
                await FileSystem.deleteAsync(tempPath, { idempotent: true });

                setDownloadedSongs(prev => ({ ...prev, [song.id]: true }));
            }

            console.log(`Playlist "${playlist.title}" downloaded.`);
        } catch (e) {
            console.error(`Failed to download playlist ${playlist.title}:`, e);
        } finally {
            downloadTasks.current.delete(playlist.id);
            setDownloadingIds(prev => prev.filter(id => id !== playlist.id));
            cancelledIds.current.delete(playlist.id);
        }
    };

    const cancelDownload = (id: string) => {
        cancelledIds.current.add(id);
        setDownloadingIds(prev => prev.filter(d => d !== id));

        const task = downloadTasks.current.get(id);
        if (task) {
            task.pauseAsync()
                .then(() => {
                    console.log(`Paused download for ID ${id}`);
                    downloadTasks.current.delete(id);
                })
                .catch(err => {
                    console.warn(`Failed to pause download ${id}:`, err);
                });
        }

        if (markedAlbums.has(id)) {
            setMarkedAlbums(prev => {
                const updated = new Set(prev);
                updated.delete(id);
                saveMarkedAlbums(updated);
                return updated;
            });
        }

        if (markedPlaylists.has(id)) {
            setMarkedPlaylists(prev => {
                const updated = new Set(prev);
                updated.delete(id);
                saveMarkedPlaylists(updated);
                return updated;
            });
        }
    };

    const downloadAllAlbums = async (albums: AlbumData[]) => {
        if (isCancellingAll.current) {
            console.log('Skipping downloadAll because cancellation is in progress.');
            return; // prevent this call until canceling finishes
        }

        cancelledIds.current.clear();
        isCancellingAll.current = false;
        const CONCURRENCY = 3;

        const queue = albums.filter(album =>
            !isAlbumDownloaded(album) && !isDownloadingAlbum(album.id)
        );

        const workers: Promise<void>[] = [];

        for (let i = 0; i < CONCURRENCY; i++) {
            workers.push(
                (async function worker() {
                    while (queue.length > 0 && !isCancellingAll.current) {
                        const album = queue.shift();
                        if (album) await downloadAlbum(album);
                    }
                })()
            );
        }

        await Promise.all(workers);

        isCancellingAll.current = false;
    };

    const uploadToServer = async (songId: string, rawPath: string, finalPath: string): Promise<boolean> => {
        const fileInfo = await FileSystem.getInfoAsync(rawPath);
        if (!fileInfo.exists) {
            console.warn(`Temp file for ${songId} not found.`);
            return false;
        }

        const formData = new FormData();
        formData.append('audio', {
            uri: rawPath,
            name: `${songId}.mp3`,
            type: 'audio/mpeg',
        } as any);

        try {
            const response = await fetch(`https://rawarr-server-af0092d911f6.herokuapp.com/api/upload/upload-audio?quality=${audioQuality}`, {
                method: 'POST',
                headers: { 'Content-Type': 'multipart/form-data' },
                body: formData,
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Server error: ${response.status} - ${text}`);
            }

            const compressedData = await response.blob();
            const tempFile = FileSystem.cacheDirectory + `compressed-${songId}.mp3`;

            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                await FileSystem.writeAsStringAsync(tempFile, base64, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                await FileSystem.moveAsync({ from: tempFile, to: finalPath });
                const finalInfo = await FileSystem.getInfoAsync(finalPath);
                if (finalInfo.exists && finalInfo.size != null) {
                    setDownloadedSize(prev => prev + finalInfo.size);
                }
            };
            reader.readAsDataURL(compressedData);

            return true;
        } catch (err) {
            console.error('Failed to upload/download transcoded audio:', err);
            return false;
        }
    };

    const getSongLocalUri = async (songId: string): Promise<string | null> => {
        const path = getSongFilePath(songId);
        const info = await FileSystem.getInfoAsync(path);
        return info.exists ? path : null;
    };

    const isSongDownloaded = (songId: string): boolean => {
        return downloadedSongs[songId];
    };

    const isAlbumDownloaded = (album: AlbumData): boolean => {
        if (!album.songs || album.songs.length === 0) return false;
        return album.songs.every(song => isSongDownloaded(song.id));
    };

    const isDownloadingAlbum = (albumId: string): boolean => {
        return downloadingIds.includes(albumId);
    };

    const isPlaylistDownloaded = (playlist: PlaylistData): boolean => {
        if (!playlist.songs || playlist.songs.length === 0) return false;
        return playlist.songs.every(song => isSongDownloaded(song.id));
    };

    const isDownloadingPlaylist = (playlistId: string): boolean => {
        return downloadingIds.includes(playlistId);
    };

    const getDownloadedSongsCount = (): number => {
        return Object.keys(downloadedSongs).length;
    };

    const clearAllDownloads = async () => {
        try {
            await FileSystem.deleteAsync(SONGS_DIR, { idempotent: true });
            await AsyncStorage.removeItem(STORAGE_KEYS.albums);
            await AsyncStorage.removeItem(STORAGE_KEYS.playlists);

            setDownloadedSongs({});
            setMarkedAlbums(new Set());
            setMarkedPlaylists(new Set());
            setDownloadedSize(0);
            console.log('All downloads cleared.');
        } catch (error) {
            console.error('Failed to clear downloads:', error);
        }
    };

    const cancelDownloadAll = () => {
        isCancellingAll.current = true;

        albums.forEach(album => {
            cancelledIds.current.add(album.id);
        });

        playlists.forEach(playlist => {
            cancelledIds.current.add(playlist.id);
        });

        setDownloadingIds([]);
    };

    const getFormattedDownloadSize = () => {
        const mb = downloadedSize / (1024 * 1024);
        return `${mb.toFixed(2)} MB`;
    };

    const checkAndResumeIncompleteDownloads = async () => {
        for (const album of albums) {
            if (markedAlbums.has(album.id)) {
                const incomplete = album.songs.filter(song => !downloadedSongs[song.id]);
                if (incomplete.length > 0) {
                    console.log(`Resuming album: ${album.title}`);
                    await downloadAlbum(album);
                }
            }
        }

        for (const playlist of playlists) {
            if (markedPlaylists.has(playlist.id)) {
                const incomplete = playlist.songs.filter(song => !downloadedSongs[song.id]);
                if (incomplete.length > 0) {
                    console.log(`Resuming playlist: ${playlist.title}`);
                    await downloadPlaylist(playlist);
                }
            }
        }
    };

    const hasResumedRef = useRef(false);

    useEffect(() => {
        const tryResume = async () => {
            if (
                hasLoadedDownloads &&
                hasLoadedCollections &&
                albums.length > 0 &&
                playlists.length > 0 &&
                !hasResumedRef.current
            ) {
                hasResumedRef.current = true;
                await checkAndResumeIncompleteDownloads();
            }
        };

        tryResume();
    }, [hasLoadedDownloads, hasLoadedCollections, albums, playlists]);

    return (
        <DownloadContext.Provider
            value={{
                downloadAlbum,
                downloadPlaylist,
                getSongLocalUri,
                isSongDownloaded,
                isAlbumDownloaded,
                isDownloadingAlbum,
                isPlaylistDownloaded,
                isDownloadingPlaylist,
                downloadingIds,
                getDownloadedSongsCount,
                clearAllDownloads,
                cancelDownload,
                cancelDownloadAll,
                downloadAllAlbums,
                downloadedSize,
                getFormattedDownloadSize,
                markedAlbums,
                markedPlaylists
            }}
        >
            {children}
        </DownloadContext.Provider>
    );
};