import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import TrackPlayer, {
  Capability,
  State,
  Event,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import { Album, Playlist, Song } from '@/types';
import shuffleArray from '@/utils/shuffleArray';
import { useDownload } from '@/contexts/DownloadContext';
import { useApi } from '@/api';
import { buildCover } from '@/utils/builders/buildCover';
import { useDispatch, useSelector } from 'react-redux';
import { incrementPlay } from '@/utils/redux/slices/statsSlice';
import * as listenbrainz from '@/api/listenbrainz';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectListenBrainzConfig } from '@/utils/redux/selectors/listenbrainzSelectors';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTranslation } from 'react-i18next';

function passesScrobbleThreshold(
  listenedSeconds: number,
  durationSeconds: number
): boolean {
  const duration = Number(durationSeconds) || 0;
  const threshold =
    duration > 0
      ? Math.min(Math.floor(duration * 0.5), 4 * 60)
      : 4 * 60;
  return listenedSeconds >= threshold;
}

export interface PlaybackProgress {
  position: number;
  duration: number;
  buffered: number;
}

export interface PlayingContextType {
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

  playSimilar(song: Song): Promise<void>;

  toggleShuffle(): Promise<void>;

  repeatOn: boolean;
  toggleRepeat(): void;

  shuffleOn: boolean;
  currentIndex: number;
  queueVersion: number;
  setCurrentSong(song: Song | null): void;
}

const PlayingContext = createContext<PlayingContextType | undefined>(undefined);
const PlayingProgressContext = createContext<PlaybackProgress>({ position: 0, duration: 0, buffered: 0 });

function normalizeProgress(raw: ReturnType<typeof useProgress>): PlaybackProgress {
  return {
    position: typeof raw?.position === 'number' && !Number.isNaN(raw.position) ? raw.position : 0,
    duration: typeof raw?.duration === 'number' && !Number.isNaN(raw.duration) ? raw.duration : 0,
    buffered: typeof raw?.buffered === 'number' && !Number.isNaN(raw.buffered) ? raw.buffered : 0,
  };
}

export const usePlaying = () => {
  const ctx = useContext(PlayingContext);
  if (!ctx) throw new Error('usePlaying must be used within PlayingProvider');
  return ctx;
};

export const usePlayingProgress = () => useContext(PlayingProgressContext);

export const PlayingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState.state === State.Playing;
  const rawProgress = useProgress(250);
  const progress = normalizeProgress(rawProgress);

  const api = useApi();
  const { getSongLocalUri } = useDownload();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const listenBrainzConfig = useSelector(selectListenBrainzConfig);

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [repeatOn, setRepeatOn] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [queueVersion, setQueueVersion] = useState(0);

  const queueRef = useRef<Song[]>([]);
  const originalQueueRef = useRef<Song[] | null>(null);
  const lastScrobbledIdRef = useRef<string | null>(null);
  const scrobbleStartTimeRef = useRef<number>(0);
  const lastListenedSecondsRef = useRef<number>(0);
  const currentIndexRef = useRef(0);
  const currentSongRef = useRef<Song | null>(null);
  const repeatOnRef = useRef(false);

  const bumpQueue = () => setQueueVersion(v => v + 1);

  useEffect(() => { repeatOnRef.current = repeatOn; }, [repeatOn]);

  useEffect(() => {
    TrackPlayer.setupPlayer({ autoHandleInterruptions: true }).catch(() => { }).then(() =>
      TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
          Capability.SeekTo,
        ],
      })
    ).catch(() => { });
  }, []);

  useEffect(() => {
    if (rawProgress.position != null && rawProgress.position > 0) {
      lastListenedSecondsRef.current = Math.floor(rawProgress.position);
    }
  }, [rawProgress.position]);

  const scrobbleIfNeeded = useCallback(async (
    song: Song | null,
    opts: { listenedSeconds: number; startTime: number }
  ) => {
    if (!song) return;
    if (lastScrobbledIdRef.current === song.id) return;
    const duration = Number(song.duration) || 0;
    if (!passesScrobbleThreshold(opts.listenedSeconds, duration)) return;
    lastScrobbledIdRef.current = song.id;
    if (activeServer?.id) {
      dispatch(incrementPlay({
        serverId: activeServer.id,
        songId: song.id,
        albumId: song.albumId,
        artistId: song.artistId,
      }));
    }
    if (!listenBrainzConfig?.token) return;
    try {
      await listenbrainz.submitScrobble(listenBrainzConfig, {
        artist: song.artist,
        track: song.title,
        listenedAt: Math.floor(opts.startTime / 1000),
        durationSeconds: duration > 0 ? duration : undefined,
        durationPlayedSeconds: opts.listenedSeconds,
      });
    } catch (err) {
      console.warn('ListenBrainz scrobble failed', err);
    }
  }, [activeServer?.id, listenBrainzConfig?.token, dispatch]);

  // Load a song into the player: reset, add, play. Checks local file right before playing.
  const loadAndPlay = useCallback(async (song: Song, opts?: { clearScrobbleState?: boolean }) => {
    if (opts?.clearScrobbleState) lastScrobbledIdRef.current = null;
    scrobbleStartTimeRef.current = Date.now();
    lastListenedSecondsRef.current = 0;

    await TrackPlayer.reset();

    const localUri = await getSongLocalUri(song.id).catch(() => null);
    const url = localUri ?? song.streamUrl;
    if (!url) return;

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
  }, [getSongLocalUri]);

  // Preload the next song in the native queue so gapless playback works.
  const appendNextIfNeeded = useCallback(async (index: number) => {
    const next = queueRef.current[index + 1];
    if (!next) return;
    try {
      const nativeQueue = await TrackPlayer.getQueue();
      if (nativeQueue.some(t => t.id === next.id)) return;
      const localUri = await getSongLocalUri(next.id).catch(() => null);
      const url = localUri ?? next.streamUrl;
      if (!url) return;
      const cover = buildCover(next.cover, 'grid') || undefined;
      await TrackPlayer.add({
        id: next.id,
        title: next.title,
        artist: next.artist,
        artwork: cover,
        url,
        duration: parseFloat(next.duration || '0'),
      });
    } catch (err) {
      console.warn('[PlayingContext] appendNextIfNeeded failed', err);
    }
  }, [getSongLocalUri]);

  useTrackPlayerEvents(
    [Event.PlaybackActiveTrackChanged, Event.PlaybackError],
    async (event) => {
      if (event.type === Event.PlaybackError) {
        toast.error(t('common.playbackError'));
        const nextIdx = currentIndexRef.current + 1;
        if (nextIdx < queueRef.current.length) {
          currentIndexRef.current = nextIdx;
          setCurrentIndex(nextIdx);
          await loadAndPlay(queueRef.current[nextIdx]);
        }
        return;
      }

      if (!event.track) return;

      const prev = currentSongRef.current;
      if (prev) {
        await scrobbleIfNeeded(prev, {
          listenedSeconds: lastListenedSecondsRef.current,
          startTime: scrobbleStartTimeRef.current,
        });
      }

      const newIndex = queueRef.current.findIndex(s => s.id === event.track!.id);
      if (newIndex === -1) return;

      scrobbleStartTimeRef.current = Date.now();
      lastListenedSecondsRef.current = 0;
      currentIndexRef.current = newIndex;
      setCurrentIndex(newIndex);
      currentSongRef.current = queueRef.current[newIndex];
      setCurrentSong(queueRef.current[newIndex]);
      await appendNextIfNeeded(newIndex);
    }
  );

  const playSong = async (song: Song) => {
    queueRef.current = [song];
    originalQueueRef.current = null;
    setShuffleOn(false);
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    bumpQueue();
    await loadAndPlay(song, { clearScrobbleState: true });
  };

  const playSongInCollection = async (
    selectedSong: Song,
    collection: Album | Playlist,
    shuffle = false
  ) => {
    let songs = [...collection.songs];
    let index = 0;

    if (shuffle) {
      originalQueueRef.current = songs;
      songs = shuffleArray(songs);
      index = 0;
      setShuffleOn(true);
    } else {
      originalQueueRef.current = null;
      index = songs.findIndex(s => s.id === selectedSong.id);
      setShuffleOn(false);
    }

    queueRef.current = songs;
    currentIndexRef.current = index;
    setCurrentIndex(index);
    bumpQueue();
    await loadAndPlay(songs[index], { clearScrobbleState: true });
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
    const toAdd = shuffleArray(collection.songs.filter(s => !existingIds.has(s.id)));
    if (!toAdd.length) return;
    queueRef.current = [...queueRef.current, ...toAdd];
    bumpQueue();
  };

  const skipToNext = async () => {
    await scrobbleIfNeeded(currentSongRef.current, {
      listenedSeconds: lastListenedSecondsRef.current,
      startTime: scrobbleStartTimeRef.current,
    });
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx >= queueRef.current.length) {
      if (!repeatOnRef.current) return;
      currentIndexRef.current = 0;
      setCurrentIndex(0);
      await loadAndPlay(queueRef.current[0]);
      return;
    }
    currentIndexRef.current = nextIdx;
    setCurrentIndex(nextIdx);
    await loadAndPlay(queueRef.current[nextIdx]);
  };

  const skipToPrevious = async () => {
    await scrobbleIfNeeded(currentSongRef.current, {
      listenedSeconds: lastListenedSecondsRef.current,
      startTime: scrobbleStartTimeRef.current,
    });
    const prev = currentIndexRef.current - 1;
    if (prev < 0) return;
    currentIndexRef.current = prev;
    setCurrentIndex(prev);
    await loadAndPlay(queueRef.current[prev]);
  };

  const skipTo = async (index: number) => {
    if (!queueRef.current[index]) return;
    currentIndexRef.current = index;
    setCurrentIndex(index);
    await loadAndPlay(queueRef.current[index]);
  };

  const pauseSong = async () => TrackPlayer.pause();
  const resumeSong = async () => TrackPlayer.play();
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
    if (!currentSongRef.current) return;
    const q = queueRef.current.filter(s => s.id !== song.id);
    q.splice(currentIndexRef.current + 1, 0, song);
    queueRef.current = q;
    bumpQueue();
  };

  const playSimilar = async (song: Song) => {
    try {
      const similarSongs = await api.similar.getSimilarSongs(song.id);
      const others = similarSongs.filter(s => s.id !== song.id);
      const songs = [song, ...shuffleArray(others)];
      const collection: Playlist = {
        id: 'similar',
        title: 'Similar',
        subtext: '',
        cover: { kind: 'none' },
        changed: new Date(),
        created: new Date(),
        songs,
      };
      await playSongInCollection(song, collection, false);
      if (others.length > 0) toast.success(t('common.playingSimilar'));
    } catch {
      await playSong(song);
    }
  };

  const toggleShuffle = async () => {
    if (!shuffleOn) {
      originalQueueRef.current = queueRef.current;
      const current = queueRef.current[currentIndexRef.current];
      const rest = queueRef.current.filter((_, i) => i !== currentIndexRef.current);
      queueRef.current = [current, ...shuffleArray(rest)];
      currentIndexRef.current = 0;
      setCurrentIndex(0);
      setShuffleOn(true);
    } else if (originalQueueRef.current) {
      const original = originalQueueRef.current;
      const idx = original.findIndex(s => s.id === currentSongRef.current?.id);
      queueRef.current = original;
      currentIndexRef.current = idx;
      setCurrentIndex(idx);
      setShuffleOn(false);
    }
    bumpQueue();
  };

  const toggleRepeat = () => setRepeatOn(prev => !prev);

  const resetQueue = async () => {
    lastScrobbledIdRef.current = null;
    scrobbleStartTimeRef.current = 0;
    lastListenedSecondsRef.current = 0;
    await TrackPlayer.reset();
    queueRef.current = [];
    originalQueueRef.current = null;
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    currentSongRef.current = null;
    setCurrentSong(null);
    setShuffleOn(false);
    setRepeatOn(false);
    bumpQueue();
  };

  const stableValue = useMemo<PlayingContextType>(() => ({
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
    playSimilar,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [currentSong, isPlaying, currentIndex, queueVersion, shuffleOn, repeatOn]);

  return (
    <PlayingProgressContext.Provider value={progress}>
      <PlayingContext.Provider value={stableValue}>
        {children}
      </PlayingContext.Provider>
    </PlayingProgressContext.Provider>
  );
};
