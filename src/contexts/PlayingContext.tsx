import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import TrackPlayer, {
  State,
  Event,
  Capability,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import type { Track } from 'react-native-track-player';
import { Album, Playlist, Song } from '@/types';
import shuffleArray from '@/utils/shuffleArray';
import { useApi } from '@/api';
import { buildCover } from '@/utils/builders/buildCover';
import { useDispatch, useSelector } from 'react-redux';
import { incrementPlay } from '@/utils/redux/slices/statsSlice';
import * as listenbrainz from '@/api/listenbrainz';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectListenBrainzConfig } from '@/utils/redux/selectors/listenbrainzSelectors';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTranslation } from 'react-i18next';

const WINDOW = 10;

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
  progress: PlaybackProgress;

  pauseSong(): Promise<void>;
  resumeSong(): Promise<void>;

  playSong(song: Song): Promise<void>;
  playSongInCollection(
    selectedSong: Song,
    collection: Album | Playlist,
    shuffle?: boolean
  ): Promise<void>;

  addCollectionToQueue(collection: Album | Playlist): Promise<void>;
  shuffleCollectionToQueue(collection: Album | Playlist): Promise<void>;

  skipTo(index: number): Promise<void>;
  skipToNext(): Promise<void>;
  skipToPrevious(): Promise<void>;

  getQueue(): Song[];
  resetQueue(): Promise<void>;

  moveTrack(fromIndex: number, toIndex: number): Promise<void>;

  addToQueue(song: Song): Promise<void>;
  playNext(song: Song): Promise<void>;

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

export const usePlaying = () => {
  const ctx = useContext(PlayingContext);
  if (!ctx) throw new Error('usePlaying must be used within PlayingProvider');
  return ctx;
};

export const PlayingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();

  const { state: playbackState } = usePlaybackState();
  const isPlaying = playbackState === State.Playing;

  const rawProgress = useProgress();
  const progress: PlaybackProgress = {
    position: typeof rawProgress.position === 'number' && !Number.isNaN(rawProgress.position) ? rawProgress.position : 0,
    duration: typeof rawProgress.duration === 'number' && !Number.isNaN(rawProgress.duration) ? rawProgress.duration : 0,
    buffered: typeof rawProgress.buffered === 'number' && !Number.isNaN(rawProgress.buffered) ? rawProgress.buffered : 0,
  };

  const api = useApi();
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

  // Window tracking
  const windowStartRef = useRef(0);
  const repeatOnRef = useRef(false);
  const currentIndexRef = useRef(0);

  // Sync ref for current song (used in event handlers to avoid stale closures)
  const currentSongRef = useRef<Song | null>(null);
  // Tracks the last virtual index that was processed, to avoid double-scrobbling
  const lastEventVirtualIdxRef = useRef(-1);

  const bumpQueue = () => setQueueVersion(v => v + 1);

  const updateCurrentIndex = (index: number) => {
    currentIndexRef.current = index;
    setCurrentIndex(index);
  };

  const updateCurrentSong = useCallback((song: Song | null) => {
    currentSongRef.current = song;
    setCurrentSong(song);
  }, []);

  useEffect(() => {
    TrackPlayer.setupPlayer().catch(() => {
      // Player may already be set up
    }).then(() => {
      return TrackPlayer.updateOptions({
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
          Capability.SeekTo,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.Stop,
        ],
      });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (rawProgress.position != null && rawProgress.position > 0) {
      lastListenedSecondsRef.current = Math.floor(rawProgress.position);
    }
  }, [rawProgress.position]);

  const scrobbleIfNeeded = useCallback(async (
    song: Song | null,
    opts: {
      listenedSeconds: number;
      startTime: number;
    }
  ) => {
    if (!song) return;
    if (lastScrobbledIdRef.current === song.id) return;

    const duration = Number(song.duration) || 0;
    if (!passesScrobbleThreshold(opts.listenedSeconds, duration)) return;

    lastScrobbledIdRef.current = song.id;

    if (activeServer?.id) {
      dispatch(
        incrementPlay({
          serverId: activeServer.id,
          songId: song.id,
          albumId: song.albumId,
          artistId: song.artistId,
        })
      );
    }

    if (!listenBrainzConfig?.token) return;

    const listenedAt = Math.floor(opts.startTime / 1000);
    try {
      await listenbrainz.submitScrobble(listenBrainzConfig, {
        artist: song.artist,
        track: song.title,
        listenedAt,
        durationSeconds: duration > 0 ? duration : undefined,
        durationPlayedSeconds: opts.listenedSeconds,
      });
    } catch (err) {
      console.warn('ListenBrainz scrobble failed', err);
    }
  }, [activeServer?.id, listenBrainzConfig?.token, dispatch]);

  const songToTrack = useCallback((song: Song): Track => {
    const cover = buildCover(song.cover, 'grid') || undefined;
    return {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: '',
      duration: parseFloat(song.duration || '0'),
      url: song.streamUrl,
      artwork: cover,
      // Custom fields for artist/album navigation
      artistId: song.artistId,
      albumId: song.albumId,
    } as Track;
  }, []);

  const rebuildWindow = useCallback(async (virtualIdx: number) => {
    windowStartRef.current = virtualIdx;
    scrobbleStartTimeRef.current = Date.now();
    lastListenedSecondsRef.current = 0;

    const slice = queueRef.current.slice(virtualIdx, virtualIdx + WINDOW);
    if (!slice.length) return;

    const tracks = slice.map(songToTrack);
    await TrackPlayer.setQueue(tracks);
    await TrackPlayer.play();
  }, [songToTrack]);

  useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], async (event) => {
    const nativeIdx = event.index ?? 0;
    const virtualIdx = windowStartRef.current + nativeIdx;

    // Only scrobble when the virtual track actually changes
    if (virtualIdx !== lastEventVirtualIdxRef.current) {
      const prev = currentSongRef.current;
      if (prev) {
        await scrobbleIfNeeded(prev, {
          listenedSeconds: lastListenedSecondsRef.current,
          startTime: scrobbleStartTimeRef.current,
        });
      }
      scrobbleStartTimeRef.current = Date.now();
      lastListenedSecondsRef.current = 0;
    }

    lastEventVirtualIdxRef.current = virtualIdx;

    const newSong = queueRef.current[virtualIdx];
    if (newSong) {
      currentSongRef.current = newSong;
      updateCurrentIndex(virtualIdx);
      setCurrentSong(newSong);
    }

    // If ≤2 songs remain in the window, rebuild from the current position
    if (nativeIdx >= WINDOW - 2) {
      await rebuildWindow(virtualIdx);
    }
  });

  const playSong = async (song: Song) => {
    queueRef.current = [song];
    originalQueueRef.current = null;
    lastScrobbledIdRef.current = null;
    setShuffleOn(false);
    updateCurrentIndex(0);
    updateCurrentSong(song);
    bumpQueue();
    await rebuildWindow(0);
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

    lastScrobbledIdRef.current = null;
    queueRef.current = songs;
    updateCurrentIndex(index);
    updateCurrentSong(songs[index]);
    bumpQueue();
    await rebuildWindow(index);
  };

  const addCollectionToQueue = async (collection: Album | Playlist) => {
    const existingIds = new Set(queueRef.current.map(s => s.id));
    const toAdd = collection.songs.filter(s => !existingIds.has(s.id));
    if (!toAdd.length) return;
    queueRef.current = [...queueRef.current, ...toAdd];
    bumpQueue();
  };

  const shuffleCollectionToQueue = async (collection: Album | Playlist) => {
    const existingIds = new Set(queueRef.current.map(s => s.id));
    const toAdd = shuffleArray(
      collection.songs.filter(s => !existingIds.has(s.id))
    );
    if (!toAdd.length) return;
    queueRef.current = [...queueRef.current, ...toAdd];
    bumpQueue();
  };

  const skipToNext = async () => {
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx >= queueRef.current.length) {
      if (!repeatOnRef.current) return;
      updateCurrentIndex(0);
      updateCurrentSong(queueRef.current[0]);
      await rebuildWindow(0);
      return;
    }
    updateCurrentIndex(nextIdx);
    updateCurrentSong(queueRef.current[nextIdx]);
    await rebuildWindow(nextIdx);
  };

  const skipToPrevious = async () => {
    const prevIdx = currentIndexRef.current - 1;
    if (prevIdx < 0) return;
    updateCurrentIndex(prevIdx);
    updateCurrentSong(queueRef.current[prevIdx]);
    await rebuildWindow(prevIdx);
  };

  const skipTo = async (index: number) => {
    if (!queueRef.current[index]) return;
    updateCurrentIndex(index);
    updateCurrentSong(queueRef.current[index]);
    await rebuildWindow(index);
  };

  const pauseSong = async () => {
    await TrackPlayer.pause();
  };

  const resumeSong = async () => {
    await TrackPlayer.play();
  };

  const getQueue = () => [...queueRef.current];

  const moveTrack = async (from: number, to: number) => {
    if (from === to) return;

    const q = [...queueRef.current];
    const [item] = q.splice(from, 1);
    q.splice(to, 0, item);
    queueRef.current = q;

    let newIdx = currentIndexRef.current;
    if (newIdx === from) newIdx = to;
    else if (from < newIdx && to >= newIdx) newIdx = newIdx - 1;
    else if (from > newIdx && to <= newIdx) newIdx = newIdx + 1;
    updateCurrentIndex(newIdx);

    await rebuildWindow(newIdx);
    bumpQueue();
  };

  const addToQueue = async (song: Song) => {
    if (queueRef.current.some(s => s.id === song.id)) return;
    queueRef.current = [...queueRef.current, song];
    bumpQueue();
  };

  const playNext = async (song: Song) => {
    if (!currentSongRef.current) return;
    const prevIdx = currentIndexRef.current;
    const removedIdx = queueRef.current.findIndex(s => s.id === song.id);
    const q = queueRef.current.filter(s => s.id !== song.id);

    const adjustedIdx = (removedIdx !== -1 && removedIdx < prevIdx) ? prevIdx - 1 : prevIdx;
    q.splice(adjustedIdx + 1, 0, song);
    queueRef.current = q;
    updateCurrentIndex(adjustedIdx);

    await rebuildWindow(adjustedIdx);
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
      const shuffled = [current, ...shuffleArray(rest)];
      queueRef.current = shuffled;
      updateCurrentIndex(0);
      setShuffleOn(true);
      await rebuildWindow(0);
    } else if (originalQueueRef.current) {
      const original = originalQueueRef.current;
      const idx = original.findIndex(s => s.id === currentSongRef.current?.id);
      queueRef.current = original;
      const newIdx = idx >= 0 ? idx : 0;
      updateCurrentIndex(newIdx);
      setShuffleOn(false);
      await rebuildWindow(newIdx);
    }
    bumpQueue();
  };

  const toggleRepeat = () => {
    setRepeatOn(prev => {
      const newVal = !prev;
      repeatOnRef.current = newVal;
      return newVal;
    });
  };

  const resetQueue = async () => {
    lastScrobbledIdRef.current = null;
    scrobbleStartTimeRef.current = 0;
    lastListenedSecondsRef.current = 0;
    lastEventVirtualIdxRef.current = -1;
    windowStartRef.current = 0;

    await TrackPlayer.reset();

    queueRef.current = [];
    originalQueueRef.current = null;
    repeatOnRef.current = false;
    updateCurrentIndex(0);
    updateCurrentSong(null);
    setShuffleOn(false);
    setRepeatOn(false);
    bumpQueue();
  };

  return (
    <PlayingContext.Provider
      value={{
        currentSong,
        isPlaying,
        progress,
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
      }}
    >
      {children}
    </PlayingContext.Provider>
  );
};
