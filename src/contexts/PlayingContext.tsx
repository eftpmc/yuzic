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
import {
  TrackPlayer,
  PlayerQueue,
  useOnPlaybackStateChange,
  useOnPlaybackProgressChange,
  useOnChangeTrack,
} from 'react-native-nitro-player';
import { Album, Playlist, Song } from '@/types';
import shuffleArray from '@/utils/shuffleArray';
import { useApi } from '@/api';
import { buildTrackItem } from '@/utils/builders/buildTrackItem';
import { useDispatch, useSelector } from 'react-redux';
import { incrementPlay } from '@/utils/redux/slices/statsSlice';
import * as listenbrainz from '@/api/listenbrainz';
import * as navidromeScrobble from '@/api/navidrome/scrobble';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectListenBrainzConfig } from '@/utils/redux/selectors/listenbrainzSelectors';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTranslation } from 'react-i18next';
import { moveSongAfterCurrent } from './playingQueue';
import { useDownload } from './DownloadContext';

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

export const usePlaying = () => {
  const ctx = useContext(PlayingContext);
  if (!ctx) throw new Error('usePlaying must be used within PlayingProvider');
  return ctx;
};

export const usePlayingProgress = () => useContext(PlayingProgressContext);

export const PlayingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { state: playbackState } = useOnPlaybackStateChange();
  const isPlaying = playbackState === 'playing';

  const { position: rawPosition, totalDuration: rawDuration } = useOnPlaybackProgressChange();
  const progress = useMemo<PlaybackProgress>(() => ({
    position: typeof rawPosition === 'number' && !Number.isNaN(rawPosition) ? rawPosition : 0,
    duration: typeof rawDuration === 'number' && !Number.isNaN(rawDuration) ? rawDuration : 0,
    buffered: 0,
  }), [rawPosition, rawDuration]);

  const api = useApi();
  const { getLocalPath } = useDownload();
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
  // Native nitro-player queue is a sliding window of at most NATIVE_WINDOW_SIZE songs.
  // JS queueRef is the source of truth for the full queue.
  const NATIVE_WINDOW_SIZE = 5;
  const nativeWindowStartRef = useRef(0); // JS index of first song in native queue
  const nativeWindowSizeRef = useRef(0);  // count of songs currently in native queue
  const lastScrobbledIdRef = useRef<string | null>(null);
  const scrobbleStartTimeRef = useRef<number>(0);
  const lastListenedSecondsRef = useRef<number>(0);
  const currentIndexRef = useRef(0);
  const currentSongRef = useRef<Song | null>(null);
  const repeatOnRef = useRef(false);
  const isPlayingRef = useRef(false);
  const isShufflingRef = useRef(false);
  const sessionPlaylistIdRef = useRef<string | null>(null);
  const scrobbleIfNeededRef = useRef<(
    song: Song | null,
    opts: { listenedSeconds: number; startTime: number }
  ) => Promise<void>>(async () => {});

  const bumpQueue = useCallback(() => setQueueVersion(v => v + 1), []);

  useEffect(() => { repeatOnRef.current = repeatOn; }, [repeatOn]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  useEffect(() => {
    TrackPlayer.configure({
      androidAutoEnabled: true,
      carPlayEnabled: true,
      showInNotification: true,
      lookaheadCount: 3,
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (rawPosition != null && rawPosition > 0) {
      lastListenedSecondsRef.current = Math.floor(rawPosition);
    }
  }, [rawPosition]);

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
    if (activeServer?.type === 'navidrome') {
      const password = activeServer.auth?.password as string | undefined;
      if (activeServer.serverUrl && activeServer.username && password) {
        try {
          await navidromeScrobble.scrobble(
            {
              serverUrl: activeServer.serverUrl,
              username: activeServer.username,
              password,
              basicAuth: activeServer.basicAuth,
            },
            song.id,
            opts.startTime
          );
        } catch (err) {
          console.warn('Navidrome scrobble failed', err);
        }
      }
    } else {
      try {
        await api.songs.scrobble(song.id, opts.startTime);
      } catch {
        // server scrobble is best-effort; never block playback
      }
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
  }, [activeServer, listenBrainzConfig, dispatch, api]);

  useEffect(() => {
    scrobbleIfNeededRef.current = scrobbleIfNeeded;
  }, [scrobbleIfNeeded]);

  const resolvePlayableSong = useCallback((song: Song): Song => {
    const localPath = getLocalPath(song.id);
    return localPath ? { ...song, streamUrl: localPath } : song;
  }, [getLocalPath]);

  // Destroy the current native playlist and build a fresh window of NATIVE_WINDOW_SIZE
  // songs centred on targetIndex (1 behind + up to 4 ahead). Returns the new playlist id.
  const buildNativeWindow = useCallback(async (songs: Song[], targetIndex: number): Promise<string> => {
    if (sessionPlaylistIdRef.current) {
      const oldId = sessionPlaylistIdRef.current;
      sessionPlaylistIdRef.current = null;
      PlayerQueue.deletePlaylist(oldId).catch(() => { });
    }
    const windowStart = Math.max(0, targetIndex - 1);
    const windowEnd = Math.min(songs.length, windowStart + NATIVE_WINDOW_SIZE);
    const windowSongs = songs.slice(windowStart, windowEnd);
    const playlistId = await PlayerQueue.createPlaylist('Yuzic Session');
    sessionPlaylistIdRef.current = playlistId;
    nativeWindowStartRef.current = windowStart;
    nativeWindowSizeRef.current = windowSongs.length;
    await PlayerQueue.addTracksToPlaylist(playlistId, windowSongs.map(s => buildTrackItem(resolvePlayableSong(s))));
    await PlayerQueue.loadPlaylist(playlistId);
    return playlistId;
  }, [resolvePlayableSong]);

  // Start a new session: build native window then play.
  const loadSessionPlaylist = useCallback(async (songs: Song[], startIndex: number) => {
    const playlistId = await buildNativeWindow(songs, startIndex);
    lastScrobbledIdRef.current = null;
    scrobbleStartTimeRef.current = Date.now();
    lastListenedSecondsRef.current = 0;
    await TrackPlayer.playSong(songs[startIndex].id, playlistId);
    await TrackPlayer.play();
  }, [buildNativeWindow]);

  // Track-change handler: update current song/index, scrobble previous, extend native window.
  const { track: nitroTrack } = useOnChangeTrack();
  const nitroTrackId = nitroTrack?.id;
  const nitroTrackIsPreview = nitroTrack?.extraPayload?.isPreview === 'true';

  useEffect(() => {
    if (!nitroTrackId) return;

    const prev = currentSongRef.current;
    if (prev && prev.id !== nitroTrackId) {
      scrobbleIfNeededRef.current(prev, {
        listenedSeconds: lastListenedSecondsRef.current,
        startTime: scrobbleStartTimeRef.current,
      });
      scrobbleStartTimeRef.current = Date.now();
      lastListenedSecondsRef.current = 0;
    }

    const newIndex = queueRef.current.findIndex(s => s.id === nitroTrackId);
    if (newIndex === -1) return;

    const songFromQueue = queueRef.current[newIndex];
    const isPreview = nitroTrackIsPreview || songFromQueue.isPreview;
    const resolvedSong: Song = isPreview && !songFromQueue.isPreview
      ? { ...songFromQueue, isPreview: true }
      : songFromQueue;

    currentIndexRef.current = newIndex;
    setCurrentIndex(newIndex);
    currentSongRef.current = resolvedSong;
    setCurrentSong(resolvedSong);

    // Extend native window: keep NATIVE_WINDOW_SIZE - 1 songs ahead of current.
    // This handles gapless natural advance without destroying the native playlist.
    const nativeWindowEnd = nativeWindowStartRef.current + nativeWindowSizeRef.current;
    const songsAheadInNative = nativeWindowEnd - newIndex - 1;
    const needed = (NATIVE_WINDOW_SIZE - 1) - songsAheadInNative;
    if (needed > 0 && nativeWindowEnd < queueRef.current.length && sessionPlaylistIdRef.current) {
      const toAdd = queueRef.current
        .slice(nativeWindowEnd, nativeWindowEnd + needed)
        .map(s => buildTrackItem(s));
      const pid = sessionPlaylistIdRef.current;
      PlayerQueue.addTracksToPlaylist(pid, toAdd)
        .then(() => { nativeWindowSizeRef.current += toAdd.length; })
        .catch(() => { });
    }
  }, [nitroTrackId, nitroTrackIsPreview]);

  const playSong = useCallback(async (song: Song) => {
    const playableSong = resolvePlayableSong(song);
    queueRef.current = [playableSong];
    originalQueueRef.current = null;
    setShuffleOn(false);
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    currentSongRef.current = playableSong;
    setCurrentSong(playableSong);
    bumpQueue();
    await loadSessionPlaylist([playableSong], 0);
  }, [bumpQueue, loadSessionPlaylist, resolvePlayableSong]);

  const playSongInCollection = useCallback(async (
    selectedSong: Song,
    collection: Album | Playlist,
    shuffle = false
  ) => {
    let songs = collection.songs.map(resolvePlayableSong);
    let index = 0;

    if (shuffle) {
      originalQueueRef.current = songs;
      songs = shuffleArray(songs);
      index = 0;
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
    await loadSessionPlaylist(songs, index);
  }, [bumpQueue, loadSessionPlaylist, resolvePlayableSong]);

  const addCollectionToQueue = useCallback((collection: Album | Playlist) => {
    const existingIds = new Set(queueRef.current.map(s => s.id));
    const toAdd = collection.songs
      .filter(s => !existingIds.has(s.id))
      .map(resolvePlayableSong);
    if (!toAdd.length) return;
    queueRef.current = [...queueRef.current, ...toAdd];
    // Native window is extended lazily by useOnChangeTrack as playback approaches these songs.
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
    queueRef.current = [...queueRef.current, ...toAdd];
    bumpQueue();
  }, [bumpQueue, resolvePlayableSong]);

  const skipToNext = useCallback(async () => {
    await scrobbleIfNeeded(currentSongRef.current, {
      listenedSeconds: lastListenedSecondsRef.current,
      startTime: scrobbleStartTimeRef.current,
    });
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx >= queueRef.current.length) {
      if (!repeatOnRef.current) return;
      const playlistId = await buildNativeWindow(queueRef.current, 0);
      scrobbleStartTimeRef.current = Date.now();
      lastListenedSecondsRef.current = 0;
      currentIndexRef.current = 0;
      setCurrentIndex(0);
      currentSongRef.current = queueRef.current[0];
      setCurrentSong(queueRef.current[0]);
      await TrackPlayer.playSong(queueRef.current[0].id, playlistId);
      if (isPlayingRef.current) await TrackPlayer.play();
      return;
    }
    const nextSong = queueRef.current[nextIdx];
    scrobbleStartTimeRef.current = Date.now();
    lastListenedSecondsRef.current = 0;
    currentIndexRef.current = nextIdx;
    setCurrentIndex(nextIdx);
    currentSongRef.current = nextSong;
    setCurrentSong(nextSong);
    const playlistId = await buildNativeWindow(queueRef.current, nextIdx);
    await TrackPlayer.playSong(nextSong.id, playlistId);
    if (isPlayingRef.current) await TrackPlayer.play();
  }, [buildNativeWindow, scrobbleIfNeeded]);

  const skipToPrevious = useCallback(async () => {
    await scrobbleIfNeeded(currentSongRef.current, {
      listenedSeconds: lastListenedSecondsRef.current,
      startTime: scrobbleStartTimeRef.current,
    });
    const prevIdx = currentIndexRef.current - 1;
    if (prevIdx < 0) return;
    const prevSong = queueRef.current[prevIdx];
    scrobbleStartTimeRef.current = Date.now();
    lastListenedSecondsRef.current = 0;
    currentIndexRef.current = prevIdx;
    setCurrentIndex(prevIdx);
    currentSongRef.current = prevSong;
    setCurrentSong(prevSong);
    const playlistId = await buildNativeWindow(queueRef.current, prevIdx);
    await TrackPlayer.playSong(prevSong.id, playlistId);
    if (isPlayingRef.current) await TrackPlayer.play();
  }, [buildNativeWindow, scrobbleIfNeeded]);

  const skipTo = useCallback(async (index: number) => {
    const song = queueRef.current[index];
    if (!song) return;
    if (index !== currentIndexRef.current) {
      await scrobbleIfNeeded(currentSongRef.current, {
        listenedSeconds: lastListenedSecondsRef.current,
        startTime: scrobbleStartTimeRef.current,
      });
      scrobbleStartTimeRef.current = Date.now();
      lastListenedSecondsRef.current = 0;
    }
    currentIndexRef.current = index;
    setCurrentIndex(index);
    currentSongRef.current = song;
    setCurrentSong(song);
    const playlistId = await buildNativeWindow(queueRef.current, index);
    await TrackPlayer.playSong(song.id, playlistId);
    if (isPlayingRef.current) await TrackPlayer.play();
  }, [buildNativeWindow, scrobbleIfNeeded]);

  const pauseSong = useCallback(async () => TrackPlayer.pause(), []);
  const resumeSong = useCallback(async () => TrackPlayer.play(), []);
  const getQueue = useCallback(() => [...queueRef.current], []);

  const moveTrack = useCallback((from: number, to: number) => {
    if (from === to) return;
    const q = [...queueRef.current];
    const [item] = q.splice(from, 1);
    q.splice(to, 0, item);
    queueRef.current = q;
    // Only sync to native if both positions are within the current window
    const wStart = nativeWindowStartRef.current;
    const wEnd = wStart + nativeWindowSizeRef.current;
    if (from >= wStart && from < wEnd && to >= wStart && to < wEnd && sessionPlaylistIdRef.current) {
      PlayerQueue.reorderTrackInPlaylist(sessionPlaylistIdRef.current, item.id, to - wStart)
        .catch(() => { });
    }
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
    if (queueRef.current.some(s => s.id === playableSong.id)) return;
    queueRef.current = [...queueRef.current, playableSong];
    // Song goes to end of JS queue; native window will pick it up lazily.
    bumpQueue();
  }, [bumpQueue, resolvePlayableSong]);

  const playNext = useCallback((song: Song) => {
    if (!currentSongRef.current) return;
    const playableSong = resolvePlayableSong(song);
    const update = moveSongAfterCurrent(queueRef.current, currentIndexRef.current, playableSong);
    if (!update) return;

    queueRef.current = update.queue;
    currentIndexRef.current = update.currentIndex;
    setCurrentIndex(update.currentIndex);

    // Insert into native window if the position falls within it
    const windowStart = update.removedIndex !== null && update.removedIndex < nativeWindowStartRef.current
      ? nativeWindowStartRef.current - 1
      : nativeWindowStartRef.current;
    const removedFromWindow = update.removedIndex !== null &&
      update.removedIndex >= nativeWindowStartRef.current &&
      update.removedIndex < nativeWindowStartRef.current + nativeWindowSizeRef.current;
    const windowSize = removedFromWindow
      ? nativeWindowSizeRef.current - 1
      : nativeWindowSizeRef.current;
    const nativeInsertPos = update.insertIndex - windowStart;

    if (
      nativeInsertPos >= 0 &&
      nativeInsertPos <= windowSize &&
      sessionPlaylistIdRef.current
    ) {
      const playlistId = sessionPlaylistIdRef.current;
      const removeExisting = update.removedIndex !== null
        ? PlayerQueue.removeTrackFromPlaylist(playlistId, playableSong.id).catch(() => {})
        : Promise.resolve();

      removeExisting
        .then(() => PlayerQueue.addTrackToPlaylist(playlistId, buildTrackItem(playableSong), nativeInsertPos))
        .then(() => {
          nativeWindowStartRef.current = windowStart;
          nativeWindowSizeRef.current = windowSize + 1;
        })
        .catch(() => { });
    }
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
    // Capture before any awaits — buildNativeWindow stops the native player,
    // which flips isPlayingRef to false before we'd check it below.
    const wasPlaying = isPlayingRef.current;
    const savedPosition = lastListenedSecondsRef.current;
    try {
      if (!shuffleOn) {
        originalQueueRef.current = queueRef.current;
        const current = queueRef.current[currentIndexRef.current];
        const rest = queueRef.current.filter((_, i) => i !== currentIndexRef.current);
        const shuffled = [current, ...shuffleArray(rest)];
        queueRef.current = shuffled;
        currentIndexRef.current = 0;
        setCurrentIndex(0);
        setShuffleOn(true);
        bumpQueue();
        const playlistId = await buildNativeWindow(shuffled, 0);
        await TrackPlayer.playSong(current.id, playlistId);
        await TrackPlayer.seek(savedPosition).catch(() => { });
        if (wasPlaying) await TrackPlayer.play();
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
        const playlistId = await buildNativeWindow(original, adjustedIdx);
        if (currentSongRef.current) {
          await TrackPlayer.playSong(currentSongRef.current.id, playlistId);
          await TrackPlayer.seek(savedPosition).catch(() => { });
          if (wasPlaying) await TrackPlayer.play();
        }
      }
    } finally {
      isShufflingRef.current = false;
    }
  }, [buildNativeWindow, bumpQueue, shuffleOn]);

  const toggleRepeat = useCallback(() => setRepeatOn(prev => !prev), []);

  const resetQueue = useCallback(async () => {
    lastScrobbledIdRef.current = null;
    scrobbleStartTimeRef.current = 0;
    lastListenedSecondsRef.current = 0;
    if (sessionPlaylistIdRef.current) {
      await TrackPlayer.pause().catch(() => { });
      await PlayerQueue.deletePlaylist(sessionPlaylistIdRef.current).catch(() => { });
      sessionPlaylistIdRef.current = null;
    }
    queueRef.current = [];
    originalQueueRef.current = null;
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    currentSongRef.current = null;
    setCurrentSong(null);
    setShuffleOn(false);
    setRepeatOn(false);
    bumpQueue();
  }, [bumpQueue]);

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
  }), [
    currentSong,
    isPlaying,
    pauseSong,
    resumeSong,
    currentIndex,
    queueVersion,
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
  ]);

  return (
    <PlayingProgressContext.Provider value={progress}>
      <PlayingContext.Provider value={stableValue}>
        {children}
      </PlayingContext.Provider>
    </PlayingProgressContext.Provider>
  );
};
