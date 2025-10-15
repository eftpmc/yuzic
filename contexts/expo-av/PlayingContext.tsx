import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';

interface SongData {
    id: string;
    title: string;
    artist: string;
    cover: string;
    duration: string;
    streamUrl: string;
}

interface Collection {
    id: string;
    title: string;
    artist?: string;
    cover?: string;
    songs: SongData[];
    type: 'album' | 'playlist';
}

interface PlayingContextType {
    currentSong: SongData | null;
    isPlaying: boolean;
    position: number;
    duration: number;
    playSong: (song: SongData) => Promise<void>;
    playSongInCollection: (selectedSong: SongData, collection: Collection) => Promise<void>;
    getQueue: () => SongData[];
    playNextSong: () => Promise<void>;
    playPreviousSong: () => Promise<void>;
    handlePlayPause: () => Promise<void>;
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
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSound, setCurrentSound] = useState<Audio.Sound | null>(null);
    const [queue, setQueue] = useState<SongData[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);

    Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers, // Change as you like
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers, // Change as you like
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: true,
    });

    const unloadSound = async (sound: Audio.Sound | null) => {
        if (sound) {
            try {
                const status = await sound.getStatusAsync();
                if (status.isLoaded) {
                    await sound.stopAsync();
                    await sound.unloadAsync();
                }
            } catch (error) {
                console.error('Error unloading sound:', error.message);
            }
        }
    };

    const playSong = async (song: SongData) => {
        try {
            // Unload previous sound first
            if (currentSound) {
                await currentSound.setOnPlaybackStatusUpdate(null); // Remove listener
                await unloadSound(currentSound);
            }

            // Load and play the new song
            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: song.streamUrl },
                { shouldPlay: true }
            );

            // Set the new sound and playback listener
            setCurrentSound(newSound);
            setCurrentSong(song);
            setIsPlaying(true);

            newSound.setOnPlaybackStatusUpdate((status) => {
                if (status.isLoaded) {
                    setPosition(status.positionMillis || 0);
                    setDuration(status.durationMillis || 0);

                    // Handle end of song
                    if (status.didJustFinish) {
                        playNextSong();
                    }
                } else if (status.error) {
                    console.error('Playback error:', status.error);
                }
            });
        } catch (error) {
            console.error('Error playing song:', error.message);
        }
    };


    const playNextSong = async () => {
        if (currentIndex + 1 < queue.length) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            await playSong(queue[nextIndex]);
        } else {
            setIsPlaying(false);
        }
    };

    const playPreviousSong = async () => {
        if (currentIndex > 0) {
            const prevIndex = currentIndex - 1;
            setCurrentIndex(prevIndex);
            await playSong(queue[prevIndex]);
        }
    };

    const playSongInCollection = async (selectedSong: SongData, collection: Collection) => {
        try {
            setQueue(collection.songs);
            const startIndex = collection.songs.findIndex((song) => song.id === selectedSong.id);
            if (startIndex !== -1) {
                setCurrentIndex(startIndex);
                await playSong(collection.songs[startIndex]);
            } else {
                console.warn('Selected song not found in collection');
            }
        } catch (error) {
            console.error('Error playing song in collection:', error.message);
        }
    };

    const getQueue = (): SongData[] => queue;

    const handlePlayPause = async () => {
        if (currentSound) {
            try {
                const status = await currentSound.getStatusAsync();
                if (status.isLoaded) {
                    if (status.isPlaying) {
                        await currentSound.pauseAsync();
                        setIsPlaying(false);
                    } else {
                        await currentSound.playAsync();
                        setIsPlaying(true);
                    }
                }
            } catch (error) {
                console.error('Error toggling play/pause:', error.message);
            }
        }
    };

    useEffect(() => {
        return () => {
            unloadSound(currentSound);
        };
    }, [currentSound]);

    return (
        <PlayingContext.Provider
            value={{
                currentSong,
                isPlaying,
                position,
                duration,
                playSong,
                playSongInCollection,
                getQueue,
                playNextSong,
                playPreviousSong,
                handlePlayPause,
            }}
        >
            {children}
        </PlayingContext.Provider>
    );
};