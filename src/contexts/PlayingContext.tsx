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
import { Album, Playlist, Song } from '@/types';
import shuffleArray from '@/utils/shuffleArray';
import { useDownload } from '@/contexts/DownloadContext';
import { useApi } from '@/api';
import { buildCover } from '@/utils/builders/buildCover';

TrackPlayer.registerPlaybackService(() => PlaybackService);

interface PlayingContextType {
  currentSong: Song | null;
  isPlaying: boolean;

  pauseSong(): Promise<void>;
  resumeSong(): Promise<void>;

  playSong(song: Song): Promise<void>;
  playSongInCollection(
    selectedSong: Song,
    collection: Album | Playlist,
    shuffle?: boolean
  ): Promise<void>;

  addCollectionToQueue(collection: Album | Playlist): void;
  shuffleCollectionToQueue(collection: Album | Playlist): void;

  skipTo(index: number): Promise<void>;
  skipToNext(): Promise<void>;
  skipToPrevious(): Promise<void>;

  getQueue(): Song[];
  resetQueue(): Promise<void>;

  moveTrack(fromIndex: number, toIndex: number): void;

  addToQueue(song: Song): void;
  playNext(song: Song): void;

  toggleShuffle(): Promise<void>;

  repeatOn: boolean;
  toggleRepeat(): void;

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
  const [repeatOn, setRepeatOn] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [queueVersion, setQueueVersion] = useState(0);

  const queueRef = useRef<Song[]>([]);
  const originalQueueRef = useRef<Song[] | null>(null);
  const lastScrobbledIdRef = useRef<string | null>(null);

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

  const scrobbleIfNeeded = async (song: Song | null) => {
    if (!song) return;
    if (lastScrobbledIdRef.current === song.id) return;
    try {
      await api.scrobble.submit(song.id);
      lastScrobbledIdRef.current = song.id;
    } catch { }
  };

  const loadAndPlay = async (song: Song) => {
    lastScrobbledIdRef.current = null;
    await TrackPlayer.reset();

    const url = (await getSongLocalUri(song.id)) ?? song.streamUrl;
    const cover = buildCover(song.cover, 'grid') || undefined;

    await TrackPlayer.add({
      id: song.id,
      title: song.title,
      artist: song.artist,
      artwork: cover,
      url,
      duration: parseFloat(song.duration || '0'),
    });

    setCurrentSong(song);
    await TrackPlayer.play();
  };

  const appendNextIfNeeded = async (index: number) => {
    const next = queueRef.current[index + 1];
    if (!next) return;

    const nativeQueue = await TrackPlayer.getQueue();
    const alreadyQueued = nativeQueue.some(t => t.id === next.id);
    if (alreadyQueued) return;

    const url = (await getSongLocalUri(next.id)) ?? next.streamUrl;
    const cover = buildCover(next.cover, 'grid') || undefined;

    await TrackPlayer.add({
      id: next.id,
      title: next.title,
      artist: next.artist,
      artwork: cover,
      url,
      duration: parseFloat(next.duration || '0'),
    });
  };


  useTrackPlayerEvents(
    [Event.PlaybackActiveTrackChanged],
    async event => {
      if (!event.track) return;

      const prev = currentSong;
      if (prev) {
        await scrobbleIfNeeded(prev);
      }

      const trackId = event.track.id;
      const newIndex = queueRef.current.findIndex(s => s.id === trackId);
      if (newIndex === -1) return;

      setCurrentIndex(newIndex);
      setCurrentSong(queueRef.current[newIndex]);
      await appendNextIfNeeded(newIndex);
    }
  );

  useTrackPlayerEvents(
    [Event.RemoteNext, Event.RemotePrevious],
    async event => {
      if (event.type === Event.RemoteNext) await skipToNext();
      if (event.type === Event.RemotePrevious) await skipToPrevious();
    }
  );

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
    collection: Album | Playlist,
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

  const addCollectionToQueue = (collection: Album | Playlist) => {
    const existingIds = new Set(queueRef.current.map(s => s.id));
    const toAdd = collection.songs.filter(s => !existingIds.has(s.id));
    if (!toAdd.length) return;
    queueRef.current = [...queueRef.current, ...toAdd];
    bumpQueue();
  };

  const shuffleCollectionToQueue = (collection: Album | Playlist) => {
    const existingIds = new Set(queueRef.current.map(s => s.id));
    const toAdd = shuffleArray(
      collection.songs.filter(s => !existingIds.has(s.id))
    );
    if (!toAdd.length) return;
    queueRef.current = [...queueRef.current, ...toAdd];
    bumpQueue();
  };

  const skipToNext = async () => {
    await scrobbleIfNeeded(currentSong);
    const nextIndex = currentIndex + 1;

    if (nextIndex >= queueRef.current.length) {
      if (!repeatOn) return;
      setCurrentIndex(0);
      await loadAndPlay(queueRef.current[0]);
      return;
    }

    setCurrentIndex(nextIndex);
    await loadAndPlay(queueRef.current[nextIndex]);
  };

  const skipToPrevious = async () => {
    await scrobbleIfNeeded(currentSong);
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

    setCurrentIndex(prev => {
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
    setRepeatOn(prev => !prev);
  };

  const resetQueue = async () => {
    await TrackPlayer.reset();
    queueRef.current = [];
    originalQueueRef.current = null;
    setCurrentIndex(0);
    setCurrentSong(null);
    setShuffleOn(false);
    setRepeatOn(false);
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
        addCollectionToQueue,
        shuffleCollectionToQueue,
        skipToNext,
        skipToPrevious,
        getQueue,
        resetQueue,
        skipTo,
        toggleShuffle,
        repeatOn,
        toggleRepeat,
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