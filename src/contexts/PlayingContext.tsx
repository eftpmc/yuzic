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
import { Song } from '@/types';
import shuffleArray from '@/utils/shuffleArray';
import { useApi } from '@/api';
import { useDownload } from '@/contexts/DownloadContext';

TrackPlayer.registerPlaybackService(() => PlaybackService);

interface CollectionData {
    id: string;
    title: string;
    songs: Song[];
    type: 'album' | 'playlist';
}

interface PlayingContextType {
    currentSong: Song | null;
    isPlaying: boolean;

    pauseSong(): Promise<void>;
    resumeSong(): Promise<void>;

    playSong(song: Song): Promise<void>;
    playSongInCollection(
        selectedSong: Song,
        collection: CollectionData,
        shuffle?: boolean
    ): Promise<void>;

    skipTo(index: number): Promise<void>;
    skipToNext(): Promise<void>;
    skipToPrevious(): Promise<void>;

    getQueue(): Song[];
    resetQueue(): Promise<void>;

    moveTrack(fromIndex: number, toIndex: number): void;

    addToQueue(song: Song): void;
    playNext(song: Song): void;

    toggleRepeat(): void;
    toggleShuffle(): Promise<void>;

    repeatMode: 'off' | 'one' | 'all';
    shuffleOn: boolean;
    currentIndex: number;
    queueVersion: number;
    setCurrentSong(song: Song | null): void;
}

const PlayingContext = createContext<PlayingContextType | undefined>(undefined);

export const usePlaying = () => {
    const ctx = useContext(PlayingContext);
    if (!ctx) throw new Error('usePlaying must be used within PlayingProvider');
    return ctx;
};

export const PlayingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const playbackState = usePlaybackState();
    const isPlaying = playbackState.state === State.Playing;

    const api = useApi();
    const { getSongLocalUri } = useDownload();

    const [currentSong, setCurrentSong] = useState<Song | null>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [repeatMode, setRepeatMode] = useState<'off' | 'one' | 'all'>('off');
    const [shuffleOn, setShuffleOn] = useState(false);

    const [queueVersion, setQueueVersion] = useState(0);

    const queueRef = useRef<Song[]>([]);
    const originalQueueRef = useRef<Song[] | null>(null);

    const bumpQueue = () => setQueueVersion(v => v + 1);

    useEffect(() => {
        TrackPlayer.setupPlayer().then(() =>
            TrackPlayer.updateOptions({
                capabilities: [
                    Capability.Play,
                    Capability.Pause,
                    Capability.SkipToNext,
                    Capability.SkipToPrevious,
                    Capability.Stop,
                ],
            })
        );
    }, []);

    const loadAndPlay = async (song: Song) => {
        await TrackPlayer.reset();

        const url = (await getSongLocalUri(song.id)) ?? song.streamUrl;

        await TrackPlayer.add({
            id: song.id,
            title: song.title,
            artist: song.artist,
            artwork: song.cover,
            url,
            duration: parseFloat(song.duration || '0'),
        });

        setCurrentSong(song);
        await TrackPlayer.play();
    };

    useTrackPlayerEvents([Event.PlaybackQueueEnded], async () => {
        await skipToNext();
    });

    const playSong = async (song: Song) => {
        queueRef.current = [song];
        originalQueueRef.current = null;
        setShuffleOn(false);
        setCurrentIndex(0);
        bumpQueue();
        await loadAndPlay(song);
    };

    const playSongInCollection = async (
        selectedSong: Song,
        collection: CollectionData,
        shuffle = false
    ) => {
        let songs = [...collection.songs];

        if (shuffle) {
            originalQueueRef.current = songs;
            const rest = songs.filter(s => s.id !== selectedSong.id);
            songs = [selectedSong, ...shuffleArray(rest)];
            setShuffleOn(true);
        } else {
            originalQueueRef.current = null;
            setShuffleOn(false);
        }

        queueRef.current = songs;

        const index = songs.findIndex(s => s.id === selectedSong.id);
        setCurrentIndex(index);

        bumpQueue();
        await loadAndPlay(songs[index]);
    };

    const skipToNext = async () => {
        if (repeatMode === 'one' && currentSong) {
            await loadAndPlay(currentSong);
            return;
        }

        const next = currentIndex + 1;

        if (next >= queueRef.current.length) {
            if (repeatMode === 'all' && queueRef.current.length > 0) {
                setCurrentIndex(0);
                await loadAndPlay(queueRef.current[0]);
            }
            return;
        }

        setCurrentIndex(next);
        await loadAndPlay(queueRef.current[next]);
    };

    const skipToPrevious = async () => {
        const prev = currentIndex - 1;
        if (prev < 0) return;

        setCurrentIndex(prev);
        await loadAndPlay(queueRef.current[prev]);
    };

    const skipTo = async (index: number) => {
        if (!queueRef.current[index]) return;

        setCurrentIndex(index);
        await loadAndPlay(queueRef.current[index]);
    };

    const pauseSong = async () => {
        await TrackPlayer.pause();
    };

    const resumeSong = async () => {
        await TrackPlayer.play();
    };

    const getQueue = () => [...queueRef.current];

    const moveTrack = (from: number, to: number) => {
        if (from === to) return;

        const q = [...queueRef.current];
        const [item] = q.splice(from, 1);
        q.splice(to, 0, item);
        queueRef.current = q;

        setCurrentIndex((prev) => {
            if (prev === from) return to;

            if (from < prev && to >= prev) return prev - 1;
            if (from > prev && to <= prev) return prev + 1;

            return prev;
        });

        bumpQueue();
    };

    const addToQueue = (song: Song) => {
        if (queueRef.current.some(s => s.id === song.id)) return;
        queueRef.current = [...queueRef.current, song];
        bumpQueue();
    };

    const playNext = (song: Song) => {
        if (!currentSong) return;

        const q = queueRef.current.filter(s => s.id !== song.id);
        q.splice(currentIndex + 1, 0, song);
        queueRef.current = q;
        bumpQueue();
    };

    const toggleShuffle = async () => {
        if (!shuffleOn) {
            originalQueueRef.current = queueRef.current;
            const current = queueRef.current[currentIndex];
            const rest = queueRef.current.filter((_, i) => i !== currentIndex);
            queueRef.current = [current, ...shuffleArray(rest)];
            setCurrentIndex(0);
            setShuffleOn(true);
        } else if (originalQueueRef.current) {
            const original = originalQueueRef.current;
            const idx = original.findIndex(s => s.id === currentSong?.id);
            queueRef.current = original;
            setCurrentIndex(idx);
            setShuffleOn(false);
        }

        bumpQueue();
    };

    const toggleRepeat = () => {
        setRepeatMode(prev => {
            if (prev === 'off') return 'all';
            if (prev === 'all') return 'one';
            return 'off';
        });
    };

    const resetQueue = async () => {
        await TrackPlayer.reset();
        queueRef.current = [];
        originalQueueRef.current = null;
        setCurrentIndex(0);
        setCurrentSong(null);
        setShuffleOn(false);
        setRepeatMode('off');
        bumpQueue();
    };

    return (
        <PlayingContext.Provider
            value={{
                currentSong,
                isPlaying,
                pauseSong,
                resumeSong,
                currentIndex,
                queueVersion,
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
                moveTrack,
                addToQueue,
                playNext,
            }}
        >
            {children}
        </PlayingContext.Provider>
    );
};