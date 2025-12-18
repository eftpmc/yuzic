import React, { createContext, useContext, ReactNode, useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/utils/redux/store';
import { setServerUrl, setApiKey, setAuthenticated, disconnect } from '@/utils/redux/slices/lidarrSlice';
import { toast } from '@backpackapp-io/react-native-toast';
import { useLibrary } from "@/contexts/LibraryContext";
import { useApi } from "@/api";

interface LidarrContextType {
    serverUrl: string;
    apiKey: string;
    isAuthenticated: boolean;
    setServerUrl: (url: string) => void;
    setApiKey: (key: string) => void;
    connectToServer: () => Promise<{ success: boolean; message?: string }>;
    pingServer: () => Promise<boolean>;
    testServerUrl: (url: string) => Promise<{ success: boolean; message?: string }>;
    disconnect: () => void;
    lookupArtist: (term: string) => Promise<any[] | null>;
    downloadAlbum: (albumTitle: string, artistName: string) => Promise<{ success: boolean; message?: string }>;
    getQueue: () => Promise<void>;
    queue: any[];
    startQueuePolling: () => void;
    stopQueuePolling: () => void;
}

interface LidarrProviderProps {
    children: ReactNode;
}

const normalizeTitle = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]/gi, '');

const LidarrContext = createContext<LidarrContextType | undefined>(undefined);

export const useLidarr = () => {
    const context = useContext(LidarrContext);
    if (!context) throw new Error('useLidarr must be used within LidarrProvider');
    return context;
};

export const LidarrProvider: React.FC<LidarrProviderProps> = ({ children }) => {
    const dispatch = useDispatch();
    const api = useApi();
    const { fetchLibrary } = useLibrary();
    const { serverUrl, apiKey, isAuthenticated } = useSelector(
        (state: RootState) => state.lidarr
    );

    const [queue, setQueue] = useState<any[]>([]);
    const previousQueueRef = useRef<any[]>([]);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (serverUrl && apiKey) {
            pingServer();
        }
    }, [serverUrl, apiKey]);

    const pingServer = async (): Promise<boolean> => {
        if (!serverUrl || !apiKey) return false;

        const url = `${serverUrl}/api/v1/system/status?apikey=${apiKey}`;
        try {
            const response = await fetch(url);
            const success = response.ok;
            dispatch(setAuthenticated(success));
            return success;
        } catch {
            dispatch(setAuthenticated(false));
            return false;
        }
    };

    const testServerUrl = async (url: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await fetch(url);
            if (response.ok) {
                return { success: true };
            } else {
                return { success: false, message: `Server responded with status code ${response.status}.` };
            }
        } catch {
            return { success: false, message: 'Failed to connect to the server. Check the URL.' };
        }
    };

    const connectToServer = async (): Promise<{ success: boolean; message?: string }> => {
        const success = await pingServer();
        return success
            ? { success: true }
            : { success: false, message: 'Failed to connect. Check server details.' };
    };

    const disconnectServer = () => dispatch(disconnect());

    const lookupArtist = async (term: string): Promise<any[] | null> => {
        if (!serverUrl || !apiKey) {
            console.warn('Lidarr plugin is not connected.');
            return null;
        }        

        try {
            const url = `${serverUrl}/api/v1/artist/lookup?term=${encodeURIComponent(term)}&apikey=${apiKey}`;
            const response = await fetch(url);
            if (!response.ok) {
                console.error(`Failed to lookup artist. Status: ${response.status}`);
                return null;
            }

            const data = await response.json();
            return data || [];
        } catch (error) {
            console.error('Error during artist lookup:', error);
            return null;
        }
    };

    const addArtistIfNeeded = async (artist: any): Promise<{ success: boolean; artistId?: number }> => {
        try {
            const existingArtistsRes = await fetch(`${serverUrl}/api/v1/artist?apikey=${apiKey}`);
            const existingArtists = await existingArtistsRes.json();

            const existingArtist = existingArtists.find((a: any) => a.foreignArtistId === artist.foreignArtistId);
            if (existingArtist) {
                console.log('Artist already exists.');
                return { success: true, artistId: existingArtist.id };
            }

            const rootFolderRes = await fetch(`${serverUrl}/api/v1/rootfolder?apikey=${apiKey}`);
            const rootFolders = await rootFolderRes.json();
            if (!rootFolders || rootFolders.length === 0) {
                console.error('No root folders configured.');
                return { success: false };
            }
            const rootFolderPath = rootFolders[0].path;

            const artistPayload = {
                artistName: artist.artistName,
                foreignArtistId: artist.foreignArtistId,
                artistType: artist.artistType || 'Person',
                disambiguation: artist.disambiguation || '',
                overview: artist.overview || '',
                images: artist.images || [],
                genres: artist.genres || [],
                ratings: artist.ratings || {},
                status: artist.status || 'active',
                qualityProfileId: 1,
                rootFolderPath,
                monitored: false,
                metadataProfileId: 1,
                addOptions: {
                    searchForMissingAlbums: true,
                },
            };

            const addArtistRes = await fetch(`${serverUrl}/api/v1/artist?apikey=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(artistPayload),
            });

            if (!addArtistRes.ok) {
                const errText = await addArtistRes.text();
                console.error('Error adding artist:', errText);
                return { success: false };
            }

            const addedArtist = await addArtistRes.json();
            return { success: true, artistId: addedArtist.id };
        } catch (error) {
            console.error('Error in addArtistIfNeeded:', error);
            return { success: false };
        }
    };

    const downloadAlbum = async (albumTitle: string, artistName: string): Promise<{ success: boolean; message?: string }> => {
        try {
            if (!serverUrl || !apiKey) {
                toast.error('Lidarr not connected.');
                return { success: false, message: 'Lidarr not connected.' };
            }

            const searchingToast = toast.loading('Searching for album...');

            const normalizedArtistName = normalizeTitle(artistName);
            const normalizedAlbumTitle = normalizeTitle(albumTitle);

            // First try local artist match
            const localRes = await fetch(`${serverUrl}/api/v1/artist?apikey=${apiKey}`);
            const localArtists = localRes.ok ? await localRes.json() : [];
            const localMatch = localArtists.find(
                (a: any) => normalizeTitle(a.artistName) === normalizedArtistName
            );

            if (localMatch) {
                const artistId = localMatch.id;

                const allAlbumsRes = await fetch(`${serverUrl}/api/v1/album?apikey=${apiKey}`);
                if (!allAlbumsRes.ok) throw new Error('Failed to fetch albums.');
                const allAlbums = await allAlbumsRes.json();

                const matchedAlbum = allAlbums.find(
                    (album: any) => album.artistId === artistId && normalizeTitle(album.title) === normalizedAlbumTitle
                );

                if (matchedAlbum) {
                    toast.dismiss(searchingToast);
                    toast('Album found! Starting download...');

                    const commandRes = await fetch(`${serverUrl}/api/v1/command?apikey=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: 'AlbumSearch',
                            albumIds: [matchedAlbum.id],
                        }),
                    });

                    if (!commandRes.ok) {
                        toast.error('Failed to trigger album search.');
                        return { success: false, message: 'Failed to trigger album search.' };
                    }

                    toast.success('Download triggered successfully!');
                    return { success: true };
                }
            }

            // If no local match, fall back to lookup
            const lookup = await lookupArtist(artistName);
            if (!lookup || lookup.length === 0) {
                toast.dismiss(searchingToast);
                toast.error('Artist not found.');
                return { success: false, message: 'Artist not found.' };
            }

            const candidates = lookup
                .filter(a => normalizeTitle(a.artistName) === normalizedArtistName)
                .slice(0, 3);

            for (const candidate of candidates) {
                const addResult = await addArtistIfNeeded(candidate);
                if (!addResult.success || !addResult.artistId) continue;

                const artistId = addResult.artistId;

                await new Promise(r => setTimeout(r, 3000));

                const albumsRes = await fetch(`${serverUrl}/api/v1/album?artistId=${artistId}&apikey=${apiKey}`);
                if (!albumsRes.ok) continue;

                const albums = await albumsRes.json();
                const matchedAlbum = albums.find(
                    (album: any) => album.artistId === artistId && normalizeTitle(album.title) === normalizedAlbumTitle
                );

                if (matchedAlbum) {
                    toast.dismiss(searchingToast);
                    toast('Album found! Starting download...');

                    const commandRes = await fetch(`${serverUrl}/api/v1/command?apikey=${apiKey}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: 'AlbumSearch',
                            albumIds: [matchedAlbum.id],
                        }),
                    });

                    if (!commandRes.ok) {
                        toast.error('Failed to trigger album search.');
                        return { success: false, message: 'Failed to trigger album search.' };
                    }

                    toast.success('Download triggered successfully!');
                    return { success: true };
                }

                // Only delete if artist was freshly added (optional)
                console.warn(`Deleting artist ${artistId} due to no album match`);
                await fetch(`${serverUrl}/api/v1/artist/${artistId}?apikey=${apiKey}`, {
                    method: 'DELETE',
                });
            }

            toast.dismiss(searchingToast);
            toast.error('Album not found from matched artists.');
            return { success: false, message: 'Album not found from matched artists.' };
        } catch (err) {
            console.error('Download album error:', err);
            toast.error('An error occurred during album download.');
            return { success: false, message: 'An error occurred.' };
        }
    };

    const getQueue = async () => {
        if (!serverUrl || !apiKey) return;

        try {
            const response = await fetch(`${serverUrl}/api/v1/queue?apikey=${apiKey}`);
            if (!response.ok) return;

            const data = await response.json();
            const currentQueue = data.records || [];

            detectFinishedDownloads(previousQueueRef.current, currentQueue);

            previousQueueRef.current = currentQueue;
            setQueue(currentQueue);
        } catch (error) {
            console.error('Error fetching queue:', error);
        }
    };

    const detectFinishedDownloads = (previous: any[], current: any[]) => {
        const previousIds = new Set(previous.map(item => item.id));
        const currentIds = new Set(current.map(item => item.id));

        const disappearedIds = [...previousIds].filter(id => !currentIds.has(id));
        const finishedItems = previous.filter(item => disappearedIds.includes(item.id));

        if (finishedItems.length > 0) {
            toast('Download complete!', { duration: 5000 });

            api.auth.startScan().then((result) => {
                if (result.success) {
                    console.log('Library scan complete');
                    fetchLibrary(true);
                } else {
                    console.warn('Library scan failed:', result.message);
                }
            });
        }
    };

    const startQueuePolling = () => {
        if (!serverUrl  || !apiKey) return;
        if (pollingIntervalRef.current) return;

        getQueue(); // Initial fetch
        pollingIntervalRef.current = setInterval(getQueue, 10000);
    };

    const stopQueuePolling = () => {
        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
        }
    };

    return (
        <LidarrContext.Provider
            value={{
                serverUrl,
                apiKey,
                isAuthenticated,
                setServerUrl: (url) => dispatch(setServerUrl(url)),
                setApiKey: (key) => dispatch(setApiKey(key)),
                connectToServer,
                pingServer,
                testServerUrl,
                disconnect: disconnectServer,
                lookupArtist,
                downloadAlbum,
                getQueue,
                queue,
                startQueuePolling,
                stopQueuePolling,
            }}
        >
            {children}
        </LidarrContext.Provider>
    );
};