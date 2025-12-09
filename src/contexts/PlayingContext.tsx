import React, {
    createContext,
    useContext,
    useState,
    ReactNode,
    useEffect,
    useRef,
} from 'react';
import TrackPlayer, {
    Capability,
    State,
    usePlaybackState,
    RepeatMode,
    Event,
    useTrackPlayerEvents,
} from 'react-native-track-player';
import { PlaybackService } from '@/utils/track-player/PlaybackService';
import { SongData } from '@/types';
import shuffleArray from '@/utils/shuffleArray';
import { scrobbleTrack } from '@/utils/navidrome/scrobble';
import { useServer } from "@/contexts/ServerContext";
import { incrementUserPlayCount } from '@/utils/redux/slices/userStatsSlice';
import { useDispatch } from 'react-redux';
import { useDownload } from "@/contexts/DownloadContext";
import { useSettings } from "@/contexts/SettingsContext"

TrackPlayer.registerPlaybackService(() => PlaybackService);

interface CollectionData {
    id: string;
    title: string;
    artist?: any;
    cover?: string;
    songs: SongData[];
    type: 'album' | 'playlist';
}

interface PlayingContextType {
    currentSong: SongData | null;
    isPlaying: boolean;
    pauseSong: () => Promise<void>;
    resumeSong: () => Promise<void>;
    skipTo: (index: number) => Promise<void>;
    currentIndex: number;
    setCurrentSong: (song: SongData | null) => void;
    playSong: (song: SongData) => Promise<void>;
    playSongInCollection: (
        selectedSong: SongData,
        collection: CollectionData,
        shuffle?: boolean
    ) => Promise<void>;
    skipToNext: () => Promise<void>;
    skipToPrevious: () => Promise<void>;
    getQueue: () => Promise<SongData[]>;
    resetQueue: () => Promise<void>;
    toggleRepeat: () => void;
    toggleShuffle: () => Promise<void>;
    repeatMode: 'off' | 'one' | 'all';
    shuffleOn: boolean;
    moveTrack: (fromIndex: number, toIndex: number) => Promise<void>;
}

const PlayingContext = createContext<PlayingContextType | undefined>(undefined);
export const usePlaying = () => {
    const context = useContext(PlayingContext);
    if (!context) {
        throw new Error('usePlaying must be used within a PlayingProvider');
    }
    return context;
};

export const PlayingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentSong, setCurrentSong] = useState<SongData | null>(null);
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
    const [shuffleOn, setShuffleOn] = useState<boolean>(false);
    const playbackState = usePlaybackState();
    const dispatch = useDispatch();
    const { serverUrl, username, password } = useServer();
    const { getSongLocalUri } = useDownload();

    const isPlaying = playbackState.state === State.Playing;

    const originalQueueRef = useRef<SongData[] | null>(null);
    const playbackStartTimeRef = useRef<number | null>(null);
    const hasScrobbledRef = useRef<boolean>(false);

    useEffect(() => {
        const sub = TrackPlayer.addEventListener(Event.PlaybackError, (error) => {
            console.error('[TrackPlayer PlaybackError]', error);
        });

        return () => sub.remove();
    }, []);

    useEffect(() => {
        const interval = setInterval(async () => {
            if (!currentSong || !serverUrl || !username || !password) return;
            if (hasScrobbledRef.current) return;
            if (!isPlaying) return;

            const duration = parseFloat(currentSong.duration);
            if (!duration || isNaN(duration)) return;

            const thresholdMs = Math.min(duration * 0.5 * 1000, 240 * 1000);
            const start = playbackStartTimeRef.current;
            if (!start) return;

            const elapsed = Date.now() - start;
            if (elapsed >= thresholdMs) {
                try {
                    await scrobbleTrack(currentSong.id, serverUrl, username, password, false); // nowPlaying=false
                    hasScrobbledRef.current = true;
                } catch (err) {
                    console.warn('Scrobble failed:', err);
                }
            }
        }, 10000); // check every 10 seconds

        return () => clearInterval(interval);
    }, [currentSong?.id, isPlaying]);

    useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], async () => {
        try {
            const nextIndex = await TrackPlayer.getActiveTrackIndex();
            if (nextIndex == null) return;

            const next = await TrackPlayer.getTrack(nextIndex);
            if (!next) return;

            dispatch(incrementUserPlayCount(next.id));

            const localUri = await getSongLocalUri(next.id);

            setCurrentSong({
                id: next.id,
                title: next.title,
                artist: next.artist,
                cover: next.artwork,
                streamUrl: localUri ?? next.url,
                duration: next.duration?.toString() || '0',
            });
            setCurrentIndex(nextIndex);

            playbackStartTimeRef.current = Date.now();
            hasScrobbledRef.current = false;

            await scrobbleTrack(next.id, serverUrl, username, password, true);
        } catch (err) {
            console.error('[PlaybackActiveTrackChanged Error]', err);
        }
    });

    useEffect(() => {
        const setup = async () => {
            await TrackPlayer.setupPlayer();
            await TrackPlayer.updateOptions({
                capabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                    Capability.Stop,
                ],
            });
        };
        setup();
    }, []);

    const logQueueState = async (label: string) => {
        const queue = await TrackPlayer.getQueue();
        const currentTrack = await TrackPlayer.getActiveTrack();
        const index = await TrackPlayer.getActiveTrackIndex();

        console.log(label);
        console.log('Current Track:', currentTrack?.title, 'ID:', currentTrack?.id);
        console.log('Index:', index);
        console.log('Full Queue:', queue.map(q => q.title));
    };

    const toggleRepeat = async () => {
        const nextMode = repeatMode === 'off' ? 'all' : 'off';
        setRepeatMode(nextMode);
        await TrackPlayer.setRepeatMode(nextMode === 'all' ? RepeatMode.Queue : RepeatMode.Off);
    };

    const toggleShuffle = async () => {
        try {
            const fullQueue = await getQueue();
            if (!fullQueue || fullQueue.length === 0) return;

            const currentIndex = await TrackPlayer.getActiveTrackIndex();
            if (currentIndex === null || currentIndex === undefined) return;

            const currentTrack = await TrackPlayer.getTrack(currentIndex);
            if (!currentTrack) return;

            if (!shuffleOn) {
                originalQueueRef.current = fullQueue;

                const upcoming = fullQueue.slice(currentIndex + 1);
                if (upcoming.length === 0) return;

                const shuffled = shuffleArray(upcoming);

                await TrackPlayer.removeUpcomingTracks();
                const shuffledTracks = await Promise.all(
                    shuffled.map(async (song) => ({
                        id: song.id,
                        title: song.title,
                        artist: song.artist,
                        artwork: song.cover,
                        url: (await getSongLocalUri(song.id)) ?? song.streamUrl,
                        duration: song.duration ? parseFloat(song.duration) : 0,
                    }))
                );

                await TrackPlayer.add(shuffledTracks);

                setShuffleOn(true);
            } else {
                if (!originalQueueRef.current) return;

                const original = originalQueueRef.current;
                const currentId = currentTrack.id;

                const originalIndex = original.findIndex(song => song.id === currentId);
                if (originalIndex === -1) return;

                const upcoming = original.slice(originalIndex + 1);
                if (upcoming.length === 0) return;

                await TrackPlayer.removeUpcomingTracks();
                await TrackPlayer.add(
                    upcoming.map(song => ({
                        id: song.id,
                        title: song.title,
                        artist: song.artist,
                        artwork: song.cover,
                        url: song.streamUrl,
                        duration: song.duration ? parseFloat(song.duration) : 0,
                    }))
                );

                setShuffleOn(false);
            }
        } catch (error) {
            console.error('[toggleShuffle error]', error);
        }
    };

    const moveTrack = async (fromIndex: number, toIndex: number): Promise<void> => {
        try {
            const queue = await TrackPlayer.getQueue();
            const activeTrack = await TrackPlayer.getActiveTrack();
            const activeIndex = await TrackPlayer.getActiveTrackIndex();

            if (!queue || !activeTrack || activeIndex == null) {
                console.warn('[moveTrack] Queue or active track missing');
                return;
            }

            if (fromIndex === toIndex) return;

            const move = async (oldIndex: number, newIndex: number) => {
                await TrackPlayer.move(oldIndex, newIndex);
            };

            // Step 1: Simulate the target queue
            const targetQueue = [...queue];
            const movedItem = targetQueue.splice(fromIndex, 1)[0];
            targetQueue.splice(toIndex, 0, movedItem);

            const activeId = activeTrack.id;
            const draggedId = movedItem.id;

            // Step 2: Move active track first if it's changing index
            const currentActiveIndex = queue.findIndex((item) => item.id === activeId);
            const targetActiveIndex = targetQueue.findIndex((item) => item.id === activeId);

            if (currentActiveIndex !== targetActiveIndex) {
                await move(currentActiveIndex, targetActiveIndex);
                logQueueState("moved-active-first");

                // Update working copy of the queue after active move
                const newQueue = [...queue];
                const activeItem = newQueue.splice(currentActiveIndex, 1)[0];
                newQueue.splice(targetActiveIndex, 0, activeItem);

                queue.splice(0, queue.length, ...newQueue);
            }

            // Step 3: Move remaining items to match targetQueue
            for (let i = 0; i < targetQueue.length; i++) {
                if (queue[i].id !== targetQueue[i].id) {
                    const actualIndex = queue.findIndex((item) => item.id === targetQueue[i].id);
                    await move(actualIndex, i);

                    // Reflect move in our local working queue
                    const item = queue.splice(actualIndex, 1)[0];
                    queue.splice(i, 0, item);

                    logQueueState(`moved-${item.id}-to-${i}`);
                }
            }

            logQueueState("done");
        } catch (err) {
            console.error('[moveTrack error]', err);
        }
    };

    const playSong = async (song: SongData) => {
        await TrackPlayer.reset();
        await TrackPlayer.add({
            id: song.id,
            title: song.title,
            artist: song.artist,
            artwork: song.cover,
            url: (await getSongLocalUri(song.id)) ?? song.streamUrl,
            duration: song.duration ? parseFloat(song.duration) : 0,
        });
        setCurrentSong(song);
        await TrackPlayer.play();
    };

    const skipTo = async (index: number) => {
        try {
            await TrackPlayer.skip(index);
            const next = await TrackPlayer.getTrack(index);
            if (!next) return;

            setCurrentIndex(index);
            const localUri = await getSongLocalUri(next.id);

            setCurrentSong({
                id: next.id,
                title: next.title,
                artist: next.artist,
                cover: next.artwork,
                streamUrl: localUri ?? next.url,
                duration: next.duration ? parseFloat(next.duration) : 0,
            });
        } catch (error) {
            console.error('skipTo error:', error);
        }
    };

    const pauseSong = async () => {
        try {
            await TrackPlayer.pause();
        } catch (error) {
            console.error('Error pausing song:', error);
        }
    };

    const resumeSong = async () => {
        try {
            await TrackPlayer.play();
        } catch (error) {
            console.error('Error resuming song:', error);
        }
    };

    const playSongInCollection = async (
        selectedSong: SongData,
        collection: CollectionData,
        shuffle = false
    ) => {
        try {
            let songs = collection.songs?.filter(s => s.id && s.streamUrl);
            if (!songs || songs.length === 0) return;

            const first = selectedSong;
            const rest = songs.filter(s => s.id !== selectedSong.id);

            const reorderedSongs = shuffle
                ? [first, ...shuffleArray(rest)]
                : songs;

            originalQueueRef.current = reorderedSongs;

            await TrackPlayer.reset();

            const trackItems = [];
            for (const song of reorderedSongs) {
                const url = (await getSongLocalUri(song.id)) ?? song.streamUrl;
                trackItems.push({
                    id: song.id,
                    title: song.title,
                    artist: song.artist,
                    artwork: song.cover,
                    url,
                    duration: song.duration ? parseFloat(song.duration) : 0,
                });
            }
            await TrackPlayer.add(trackItems);


            // 🔥 Find the actual index of the selected song in the reordered list
            const index = reorderedSongs.findIndex(s => s.id === selectedSong.id);
            if (index !== -1) {
                await TrackPlayer.skip(index);
                setCurrentSong(reorderedSongs[index]);
                setCurrentIndex(index);
                setShuffleOn(shuffle); // only update shuffleOn here
                await TrackPlayer.play();
            }
        } catch (error) {
            console.error('[playSongInCollection error]', error);
        }
        logQueueState("collection")
    };

    const skipToNext = async () => {
        try {
            await TrackPlayer.skipToNext();
            logQueueState("skip-to-next")
        } catch (error) {
            console.error('[skipToNext error]', error);
        }
    };

    const skipToPrevious = async () => {
        try {
            await TrackPlayer.skipToPrevious();
        } catch (error) {
            console.error('[skipToPrevious error]', error);
        }
    };

    const getQueue = async (): Promise<SongData[]> => {
        try {
            const tracks = await TrackPlayer.getQueue();
            const mappedTracks = await Promise.all(
                tracks.map(async (track) => ({
                    id: track.id,
                    title: track.title,
                    artist: track.artist,
                    cover: track.artwork,
                    streamUrl: await getSongLocalUri(track.id) ?? track.url,
                    duration: track.duration?.toString() || '0',
                }))
            );
            return mappedTracks;
        } catch (error) {
            console.error('[getQueue error]', error);
            return [];
        }
    };

    const resetQueue = async () => {
        try {
            await TrackPlayer.reset();
            setCurrentSong(null);
            setCurrentIndex(0);
            setShuffleOn(false);
            setRepeatMode('off');
            originalQueueRef.current = null;
        } catch (error) {
            console.error('[resetQueue error]', error);
        }
    };

    return (
        <PlayingContext.Provider
            value={{
                currentSong,
                isPlaying,
                pauseSong,
                resumeSong,
                currentIndex,
                setCurrentSong,
                playSong,
                playSongInCollection,
                skipToNext,
                skipToPrevious,
                getQueue,
                resetQueue,
                skipTo,
                toggleRepeat,
                toggleShuffle,
                repeatMode,
                shuffleOn,
                moveTrack
            }}
        >
            {children}
        </PlayingContext.Provider>
    );
};