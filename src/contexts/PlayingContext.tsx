import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from 'react';
import TrackPlayer, {
  Event,
  MediaItem,
  PlayerCommand,
  RepeatMode,
  useActiveMediaItem,
  useIsPlaying,
  useProgress,
} from '@rntp/player';

import { Album, Playlist, Song } from '@/types';
import shuffleArray from '@/utils/shuffleArray';
import { useApi } from '@/api';
import { buildTrackItem } from '@/utils/builders/buildTrackItem';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTranslation } from 'react-i18next';
import { moveSongAfterCurrent } from './playingQueue';
import { useDownload } from './DownloadContext';
import { useScrobbling } from '@/hooks/useScrobbling';
import { useCarPlayBrowseTree } from '@/hooks/useCarPlayBrowseTree';

export interface PlaybackProgress {
  position: number;
  duration: number;
  buffered: number;
}

export interface PlayingStateType {
  currentSong: Song | null;
  isPlaying: boolean;
  currentIndex: number;
  queueVersion: number;
  repeatOn: boolean;
  shuffleOn: boolean;
  setCurrentSong(song: Song | null): void;
}

export interface PlayingActionsType {
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
  toggleRepeat(): void;
}

// Combined type kept for backward compat
export type PlayingContextType = PlayingStateType & PlayingActionsType;

const PlayingStateContext = createContext<PlayingStateType | undefined>(undefined);
const PlayingActionsContext = createContext<PlayingActionsType | undefined>(undefined);
const PlayingProgressContext = createContext<PlaybackProgress>({ position: 0, duration: 0, buffered: 0 });

let playerWasSetup = false;

export const usePlayingState = () => {
  const ctx = useContext(PlayingStateContext);
  if (!ctx) throw new Error('usePlayingState must be used within PlayingProvider');
  return ctx;
};

export const usePlayingActions = () => {
  const ctx = useContext(PlayingActionsContext);
  if (!ctx) throw new Error('usePlayingActions must be used within PlayingProvider');
  return ctx;
};

// Backward-compatible hook — consumers that need both state + actions can keep using this.
// For render-sensitive components, prefer usePlayingState() or usePlayingActions() directly.
export const usePlaying = (): PlayingContextType => {
  const state = usePlayingState();
  const actions = usePlayingActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
};

export const usePlayingProgress = () => useContext(PlayingProgressContext);

// Separate component so useProgress ticks don't rerender PlayingProvider.
const PlayingProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { position, duration, buffered } = useProgress(1);

  const progress = useMemo<PlaybackProgress>(() => ({
    position: typeof position === 'number' && !Number.isNaN(position) ? position : 0,
    duration: typeof duration === 'number' && !Number.isNaN(duration) ? duration : 0,
    buffered: typeof buffered === 'number' && !Number.isNaN(buffered) ? buffered : 0,
  }), [position, duration, buffered]);

  return (
    <PlayingProgressContext.Provider value={progress}>
      {children}
    </PlayingProgressContext.Provider>
  );
};

function getMediaItemId(item: MediaItem): string {
  return item.mediaId ?? (typeof item.url === 'string' ? item.url : '');
}

function getMediaItemUrl(item: MediaItem): string {
  if (typeof item.url === 'string') return item.url;
  if (typeof item.url === 'object' && item.url && 'uri' in item.url) return item.url.uri;
  return '';
}

function mediaItemToFallbackSong(item: MediaItem): Song | null {
  const id = getMediaItemId(item);
  const streamUrl = getMediaItemUrl(item);
  if (!id || !streamUrl) return null;
  return {
    id,
    title: item.title ?? '',
    artist: item.artist ?? '',
    albumId: '',
    artistId: '',
    duration: String(item.duration ?? 0),
    streamUrl,
    cover: { kind: 'none' },
    isPreview: false,
  } as Song;
}

function hasSameQueueIds(current: Song[], next: Song[]): boolean {
  return current.length === next.length && current.every((song, index) => song.id === next[index]?.id);
}

const toMediaItems = (songs: Song[]): MediaItem[] => songs.map(buildTrackItem);

function getSourceKind(song: Song | null): string {
  if (!song?.streamUrl) return 'none';
  if (song.filePath || song.streamUrl.startsWith('file:')) return 'file';
  if (song.streamUrl.startsWith('http://') || song.streamUrl.startsWith('https://')) return 'remote';
  return 'unknown';
}

function hasPlayableMediaUrl(song: Song): boolean {
  const url = song.streamUrl?.trim();
  if (!url) return false;
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('file://') ||
    url.startsWith('/')
  );
}

function assertPlayableSongs(songs: Song[]) {
  const invalid = songs.find(song => !hasPlayableMediaUrl(song));
  if (invalid) {
    throw new Error(`Track has no playable media URL: ${invalid.id}`);
  }
}

export const PlayingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const isPlaying = useIsPlaying();
  const activeMediaItem = useActiveMediaItem();
  const api = useApi();
  const { getLocalPath } = useDownload();

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [repeatOn, setRepeatOn] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [queueVersion, setQueueVersion] = useState(0);

  const queueRef = useRef<Song[]>([]);
  const originalQueueRef = useRef<Song[] | null>(null);
  const scrobbleStartTimeRef = useRef<number>(0);
  const currentIndexRef = useRef(0);
  const currentSongRef = useRef<Song | null>(null);
  const repeatOnRef = useRef(false);
  const shuffleOnRef = useRef(false);
  const isPlayingRef = useRef(false);
  const isShufflingRef = useRef(false);
  const lastPlaybackErrorAtRef = useRef(0);

  // Stable refs to latest callbacks — avoids stale closures in effects without listing
  // volatile deps, while keeping the callbacks themselves stable for context consumers.
  const scrobbleIfNeededRef = useRef<(
    song: Song | null,
    opts: { listenedSeconds: number; startTime: number }
  ) => Promise<void>>(async () => {});
  const submitNowPlayingRef = useRef<(song: Song) => void>(() => {});

  const { scrobbleIfNeeded, submitNowPlaying, resetLastScrobbled } = useScrobbling();

  useEffect(() => { scrobbleIfNeededRef.current = scrobbleIfNeeded; }, [scrobbleIfNeeded]);
  useEffect(() => { submitNowPlayingRef.current = submitNowPlaying; }, [submitNowPlaying]);
  useEffect(() => { repeatOnRef.current = repeatOn; }, [repeatOn]);
  useEffect(() => { shuffleOnRef.current = shuffleOn; }, [shuffleOn]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useCarPlayBrowseTree();

  useEffect(() => {
    if (!playerWasSetup) {
      try {
        TrackPlayer.setupPlayer({
          contentType: 'music',
          handleAudioBecomingNoisy: true,
          cache: {
            maxSizeBytes: 1024 * 1024 * 1024,
            preloading: { window: 2 },
          },
          android: {
            wakeMode: 'network',
            notification: {
              channelId: 'yuzic-playback',
              channelName: 'Playback',
              smallIcon: 'ic_launcher',
            },
          },
        });
        playerWasSetup = true;
      } catch (err) {
        console.warn('TrackPlayer setup failed', err);
      }
    }

    TrackPlayer.setCommands({
      capabilities: [
        PlayerCommand.PlayPause,
        PlayerCommand.Next,
        PlayerCommand.Previous,
        PlayerCommand.Seek,
        PlayerCommand.Stop,
      ],
      handling: 'native',
    });
  }, []);

  const bumpQueue = useCallback(() => setQueueVersion(v => v + 1), []);

  const clearPlaybackState = useCallback(() => {
    queueRef.current = [];
    originalQueueRef.current = null;
    currentIndexRef.current = 0;
    currentSongRef.current = null;
    setCurrentIndex(0);
    setCurrentSong(null);
    setShuffleOn(false);
    bumpQueue();
    TrackPlayer.stop();
    TrackPlayer.clear();
  }, [bumpQueue]);

  useEffect(() => {
    const subscription = TrackPlayer.addEventListener(Event.PlaybackError, event => {
      const song = currentSongRef.current;
      console.warn('Playback failed', {
        code: event.code,
        message: event.message,
        songId: song?.id,
        title: song?.title,
        source: getSourceKind(song),
        serverId: song?.sourceServerId,
        serverType: song?.sourceServerType,
      });

      clearPlaybackState();

      const now = Date.now();
      if (now - lastPlaybackErrorAtRef.current > 1500) {
        lastPlaybackErrorAtRef.current = now;
        toast.error(t('common.playbackError'));
      }
    });

    return () => subscription.remove();
  }, [clearPlaybackState, t]);

  // Build a song lookup map from the library for queue reconciliation
  const librarySongByIdRef = useRef<Map<string, Song>>(new Map());

  // Track changes: reconcile native queue, update current song, fire now-playing + scrobble
  useEffect(() => {
    const mediaId = activeMediaItem?.mediaId;
    if (!mediaId) return;

    const prev = currentSongRef.current;
    if (prev && prev.id !== mediaId) {
      scrobbleIfNeededRef.current(prev, {
        listenedSeconds: Math.floor(TrackPlayer.getProgress().position),
        startTime: scrobbleStartTimeRef.current,
      });
      scrobbleStartTimeRef.current = Date.now();
    }

    const nativeQueue = TrackPlayer.getQueue();
    const nativeQueueSongs = nativeQueue
      .map(item => {
        const id = getMediaItemId(item);
        return (
          queueRef.current.find(song => song.id === id) ??
          librarySongByIdRef.current.get(id) ??
          mediaItemToFallbackSong(item)
        );
      })
      .filter((song): song is Song => Boolean(song));

    if (nativeQueueSongs.length && !hasSameQueueIds(queueRef.current, nativeQueueSongs)) {
      queueRef.current = nativeQueueSongs;
      bumpQueue();
    }

    const nativeIndex = TrackPlayer.getActiveMediaItemIndex();
    let newIndex = typeof nativeIndex === 'number' && nativeIndex >= 0
      ? nativeIndex
      : queueRef.current.findIndex(s => s.id === mediaId);
    let songFromQueue: Song | null | undefined = newIndex >= 0
      ? queueRef.current[newIndex]
      : librarySongByIdRef.current.get(mediaId);

    if (!songFromQueue && activeMediaItem.url) {
      songFromQueue = mediaItemToFallbackSong(activeMediaItem);
      newIndex = 0;
    }

    if (!songFromQueue) return;
    if (newIndex === -1) {
      queueRef.current = [songFromQueue];
      newIndex = 0;
      bumpQueue();
    }

    currentIndexRef.current = newIndex;
    setCurrentIndex(newIndex);
    currentSongRef.current = songFromQueue;
    setCurrentSong(songFromQueue);

    submitNowPlayingRef.current(songFromQueue);
  }, [activeMediaItem, bumpQueue]);

  const resolvePlayableSong = useCallback((song: Song): Song => {
    const localPath = getLocalPath(song.id);
    return localPath ? { ...song, streamUrl: localPath } : song;
  }, [getLocalPath]);

  const loadQueue = useCallback(async (songs: Song[], startIndex: number, play = true) => {
    assertPlayableSongs(songs);
    resetLastScrobbled();
    scrobbleStartTimeRef.current = Date.now();
    TrackPlayer.setMediaItems(toMediaItems(songs), startIndex);
    if (repeatOnRef.current) TrackPlayer.setRepeatMode(RepeatMode.All);
    if (play) TrackPlayer.play();
  }, [resetLastScrobbled]);

  const playSong = useCallback(async (song: Song) => {
    const playableSong = resolvePlayableSong(song);
    assertPlayableSongs([playableSong]);
    queueRef.current = [playableSong];
    originalQueueRef.current = null;
    setShuffleOn(false);
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    currentSongRef.current = playableSong;
    setCurrentSong(playableSong);
    bumpQueue();
    await loadQueue([playableSong], 0);
  }, [bumpQueue, loadQueue, resolvePlayableSong]);

  const playSongInCollection = useCallback(async (
    selectedSong: Song,
    collection: Album | Playlist,
    shuffle = false
  ) => {
    let songs = collection.songs.map(resolvePlayableSong);
    assertPlayableSongs(songs);
    let index = 0;

    if (shuffle) {
      originalQueueRef.current = songs;
      songs = shuffleArray(songs);
      setShuffleOn(true);
    } else {
      originalQueueRef.current = null;
      index = songs.findIndex(s => s.id === selectedSong.id);
      if (index === -1) index = 0;
      setShuffleOn(false);
    }

    queueRef.current = songs;
    currentIndexRef.current = index;
    setCurrentIndex(index);
    currentSongRef.current = songs[index];
    setCurrentSong(songs[index]);
    bumpQueue();
    await loadQueue(songs, index);
  }, [bumpQueue, loadQueue, resolvePlayableSong]);

  const addCollectionToQueue = useCallback((collection: Album | Playlist) => {
    const existingIds = new Set(queueRef.current.map(s => s.id));
    const toAdd = collection.songs
      .filter(s => !existingIds.has(s.id))
      .map(resolvePlayableSong);
    if (!toAdd.length) return;
    assertPlayableSongs(toAdd);
    queueRef.current = [...queueRef.current, ...toAdd];
    TrackPlayer.addMediaItems(toMediaItems(toAdd));
    bumpQueue();
  }, [bumpQueue, resolvePlayableSong]);

  const shuffleCollectionToQueue = useCallback((collection: Album | Playlist) => {
    const existingIds = new Set(queueRef.current.map(s => s.id));
    const toAdd = shuffleArray(
      collection.songs
        .filter(s => !existingIds.has(s.id))
        .map(resolvePlayableSong)
    );
    if (!toAdd.length) return;
    assertPlayableSongs(toAdd);
    queueRef.current = [...queueRef.current, ...toAdd];
    TrackPlayer.addMediaItems(toMediaItems(toAdd));
    bumpQueue();
  }, [bumpQueue, resolvePlayableSong]);

  const skipToNext = useCallback(async () => {
    await scrobbleIfNeededRef.current(currentSongRef.current, {
      listenedSeconds: Math.floor(TrackPlayer.getProgress().position),
      startTime: scrobbleStartTimeRef.current,
    });
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx >= queueRef.current.length && !repeatOnRef.current) return;
    TrackPlayer.skipToNext();
    if (isPlayingRef.current) TrackPlayer.play();
  }, []);

  const skipToPrevious = useCallback(async () => {
    await scrobbleIfNeededRef.current(currentSongRef.current, {
      listenedSeconds: Math.floor(TrackPlayer.getProgress().position),
      startTime: scrobbleStartTimeRef.current,
    });
    if (currentIndexRef.current <= 0) return;
    TrackPlayer.skipToIndex(currentIndexRef.current - 1);
    if (isPlayingRef.current) TrackPlayer.play();
  }, []);

  const skipTo = useCallback(async (index: number) => {
    const song = queueRef.current[index];
    if (!song) return;
    if (index !== currentIndexRef.current) {
      await scrobbleIfNeededRef.current(currentSongRef.current, {
        listenedSeconds: Math.floor(TrackPlayer.getProgress().position),
        startTime: scrobbleStartTimeRef.current,
      });
      scrobbleStartTimeRef.current = Date.now();
    }
    currentIndexRef.current = index;
    setCurrentIndex(index);
    currentSongRef.current = song;
    setCurrentSong(song);
    TrackPlayer.skipToIndex(index);
    if (isPlayingRef.current) TrackPlayer.play();
  }, []);

  const pauseSong = useCallback(async () => { TrackPlayer.pause(); }, []);
  const resumeSong = useCallback(async () => { TrackPlayer.play(); }, []);
  const getQueue = useCallback(() => [...queueRef.current], []);

  const moveTrack = useCallback((from: number, to: number) => {
    if (from === to) return;
    const q = [...queueRef.current];
    const [item] = q.splice(from, 1);
    q.splice(to, 0, item);
    queueRef.current = q;
    TrackPlayer.moveMediaItem(from, to);
    setCurrentIndex(prev => {
      let next = prev;
      if (prev === from) next = to;
      else if (from < prev && to >= prev) next = prev - 1;
      else if (from > prev && to <= prev) next = prev + 1;
      currentIndexRef.current = next;
      return next;
    });
    bumpQueue();
  }, [bumpQueue]);

  const addToQueue = useCallback((song: Song) => {
    const playableSong = resolvePlayableSong(song);
    assertPlayableSongs([playableSong]);
    if (queueRef.current.some(s => s.id === playableSong.id)) return;
    queueRef.current = [...queueRef.current, playableSong];
    TrackPlayer.addMediaItem(buildTrackItem(playableSong));
    bumpQueue();
  }, [bumpQueue, resolvePlayableSong]);

  const playNext = useCallback((song: Song) => {
    if (!currentSongRef.current) return;
    const playableSong = resolvePlayableSong(song);
    assertPlayableSongs([playableSong]);
    const update = moveSongAfterCurrent(queueRef.current, currentIndexRef.current, playableSong);
    if (!update) return;
    if (update.removedIndex !== null) {
      TrackPlayer.moveMediaItem(update.removedIndex, update.insertIndex);
    } else {
      TrackPlayer.insertMediaItem(update.insertIndex, buildTrackItem(playableSong));
    }
    queueRef.current = update.queue;
    currentIndexRef.current = update.currentIndex;
    setCurrentIndex(update.currentIndex);
    bumpQueue();
  }, [bumpQueue, resolvePlayableSong]);

  const playSimilar = useCallback(async (song: Song) => {
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
  }, [api, playSong, playSongInCollection, t]);

  const toggleShuffle = useCallback(async () => {
    if (isShufflingRef.current) return;
    isShufflingRef.current = true;
    const wasPlaying = isPlayingRef.current;
    const savedPosition = TrackPlayer.getProgress().position;
    try {
      if (!shuffleOnRef.current) {
        originalQueueRef.current = queueRef.current;
        const current = queueRef.current[currentIndexRef.current];
        const rest = queueRef.current.filter((_, i) => i !== currentIndexRef.current);
        const shuffled = [current, ...shuffleArray(rest)].filter(Boolean);
        queueRef.current = shuffled;
        currentIndexRef.current = 0;
        setCurrentIndex(0);
        setShuffleOn(true);
        bumpQueue();
        await loadQueue(shuffled, 0, wasPlaying);
        TrackPlayer.seekTo(savedPosition);
      } else if (originalQueueRef.current) {
        const original = originalQueueRef.current;
        const currentId = currentSongRef.current?.id;
        const idx = currentId ? original.findIndex(s => s.id === currentId) : 0;
        const adjustedIdx = idx === -1 ? 0 : idx;
        queueRef.current = original;
        currentIndexRef.current = adjustedIdx;
        setCurrentIndex(adjustedIdx);
        setShuffleOn(false);
        originalQueueRef.current = null;
        bumpQueue();
        await loadQueue(original, adjustedIdx, wasPlaying);
        TrackPlayer.seekTo(savedPosition);
      }
    } finally {
      isShufflingRef.current = false;
    }
  }, [bumpQueue, loadQueue]);
  // Note: reads shuffleOnRef.current instead of shuffleOn state, so this callback
  // is stable and doesn't change when shuffle is toggled.

  const toggleRepeat = useCallback(() => {
    setRepeatOn(prev => {
      const next = !prev;
      TrackPlayer.setRepeatMode(next ? RepeatMode.All : RepeatMode.Off);
      return next;
    });
  }, []);

  const resetQueue = useCallback(async () => {
    await scrobbleIfNeededRef.current(currentSongRef.current, {
      listenedSeconds: Math.floor(TrackPlayer.getProgress().position),
      startTime: scrobbleStartTimeRef.current,
    });
    resetLastScrobbled();
    scrobbleStartTimeRef.current = 0;
    TrackPlayer.pause();
    TrackPlayer.clear();
    queueRef.current = [];
    originalQueueRef.current = null;
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    currentSongRef.current = null;
    setCurrentSong(null);
    setShuffleOn(false);
    setRepeatOn(false);
    TrackPlayer.setRepeatMode(RepeatMode.Off);
    bumpQueue();
  }, [bumpQueue, resetLastScrobbled]);

  const stateValue = useMemo<PlayingStateType>(() => ({
    currentSong,
    isPlaying,
    currentIndex,
    queueVersion,
    repeatOn,
    shuffleOn,
    setCurrentSong,
  }), [currentSong, isPlaying, currentIndex, queueVersion, repeatOn, shuffleOn]);

  // All callbacks are stable (deps are empty or other stable values via refs),
  // so actionsValue almost never changes after mount — action-only consumers
  // are immune to track/play/index changes.
  const actionsValue = useMemo<PlayingActionsType>(() => ({
    pauseSong,
    resumeSong,
    playSong,
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    skipTo,
    skipToNext,
    skipToPrevious,
    getQueue,
    resetQueue,
    toggleShuffle,
    toggleRepeat,
    moveTrack,
    addToQueue,
    playNext,
    playSimilar,
  }), [
    pauseSong,
    resumeSong,
    playSong,
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    skipTo,
    skipToNext,
    skipToPrevious,
    getQueue,
    resetQueue,
    toggleShuffle,
    toggleRepeat,
    moveTrack,
    addToQueue,
    playNext,
    playSimilar,
  ]);

  return (
    <PlayingActionsContext.Provider value={actionsValue}>
      <PlayingStateContext.Provider value={stateValue}>
        <PlayingProgressProvider>
          {children}
        </PlayingProgressProvider>
      </PlayingStateContext.Provider>
    </PlayingActionsContext.Provider>
  );
};
