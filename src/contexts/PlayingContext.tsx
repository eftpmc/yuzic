import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import {
  TrackPlayer,
  PlayerQueue,
  useOnPlaybackStateChange,
  useOnPlaybackProgressChange,
  useOnChangeTrack,
} from 'react-native-nitro-player';
import type { TrackItem } from 'react-native-nitro-player';
import { Album, Playlist, Song } from '@/types';
import shuffleArray from '@/utils/shuffleArray';
import { useApi } from '@/api';
import { buildCover } from '@/utils/builders/buildCover';
import { useDispatch, useSelector } from 'react-redux';
import { incrementPlay } from '@/utils/redux/slices/statsSlice';
import * as listenbrainz from '@/api/listenbrainz'
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

/** Returns the next virtual-queue index, respecting repeat mode. -1 means no next. */
function getNextVirtualIndex(queueLength: number, fromIndex: number, repeat: boolean): number {
  if (fromIndex + 1 < queueLength) return fromIndex + 1;
  if (repeat) return 0;
  return -1;
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

  const { state: playbackState } = useOnPlaybackStateChange();
  const isPlaying = playbackState === 'playing';

  const { position: rawPosition, totalDuration: rawDuration } = useOnPlaybackProgressChange();
  const progress: PlaybackProgress = {
    position: typeof rawPosition === 'number' && !Number.isNaN(rawPosition) ? rawPosition : 0,
    duration: typeof rawDuration === 'number' && !Number.isNaN(rawDuration) ? rawDuration : 0,
    buffered: 0,
  };

  const { track: changedTrack } = useOnChangeTrack();

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
  const currentPlaylistIdRef = useRef<string | null>(null);
  const lastScrobbledIdRef = useRef<string | null>(null);
  const scrobbleStartTimeRef = useRef<number>(0);
  const lastListenedSecondsRef = useRef<number>(0);
  const justRebuiltRef = useRef(false);

  // Virtual-queue refs — keep native PlayerQueue in sync with at most 2 tracks
  const nativeDirtyRef = useRef(false);
  const repeatOnRef = useRef(false);
  const currentIndexRef = useRef(0);

  const bumpQueue = () => setQueueVersion(v => v + 1);

  /** Update currentIndex state + ref together to avoid stale closures. */
  const updateCurrentIndex = (index: number) => {
    currentIndexRef.current = index;
    setCurrentIndex(index);
  };

  useEffect(() => {
    TrackPlayer.configure({
      androidAutoEnabled: true,
      carPlayEnabled: true,
      showInNotification: true,
    });
  }, []);

  useEffect(() => {
    if (rawPosition != null && rawPosition > 0) {
      lastListenedSecondsRef.current = Math.floor(rawPosition);
    }
  }, [rawPosition]);

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

  const songToTrackItem = useCallback(async (song: Song): Promise<TrackItem> => {
    const cover = buildCover(song.cover, 'grid') || undefined;
    return {
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: '',
      duration: parseFloat(song.duration || '0'),
      url: song.streamUrl,
      artwork: cover ?? null,
      extraPayload: {
        artistId: song.artistId,
        albumId: song.albumId,
      },
    };
  }, []);

  /**
   * Rebuild the native PlayerQueue with at most 2 tracks:
   * the track at startIndex and the next track (respecting repeat).
   * This is fast even for huge virtual queues since we only touch 2 songs.
   */
  const rebuildNativePlayer = useCallback(async (
    startIndex: number,
    opts?: { clearScrobbleState?: boolean }
  ) => {
    if (opts?.clearScrobbleState) lastScrobbledIdRef.current = null;
    scrobbleStartTimeRef.current = Date.now();
    lastListenedSecondsRef.current = 0;

    if (currentPlaylistIdRef.current) {
      try { PlayerQueue.deletePlaylist(currentPlaylistIdRef.current); } catch { /* ignore */ }
    }

    const queue = queueRef.current;
    const song = queue[startIndex];
    if (!song) return;

    // Build a window of at most 2 tracks: current + next (for gapless preload)
    const nextIdx = getNextVirtualIndex(queue.length, startIndex, repeatOnRef.current);
    const songsToLoad: Song[] = [song];
    if (nextIdx !== -1 && queue[nextIdx]) {
      songsToLoad.push(queue[nextIdx]);
    }

    const playlistId = PlayerQueue.createPlaylist('Now Playing', '', '');
    currentPlaylistIdRef.current = playlistId;

    const trackItems = await Promise.all(songsToLoad.map(songToTrackItem));
    PlayerQueue.addTracksToPlaylist(playlistId, trackItems);

    PlayerQueue.loadPlaylist(playlistId);
    await TrackPlayer.skipToIndex(0);

    justRebuiltRef.current = true;
    setCurrentSong(song);
    await TrackPlayer.play();

    nativeDirtyRef.current = false;

  }, [songToTrackItem]);

  /**
   * Append the next virtual-queue track to the existing native playlist
   * without rebuilding — preserves gapless playback.
   */
  const appendNextToNativePlayer = useCallback(async (virtualIndex: number) => {
    const queue = queueRef.current;
    const nextIdx = getNextVirtualIndex(queue.length, virtualIndex, repeatOnRef.current);
    if (nextIdx === -1) return;

    const nextSong = queue[nextIdx];
    if (!nextSong || !currentPlaylistIdRef.current) return;

    const trackItem = await songToTrackItem(nextSong);
    try {
      PlayerQueue.addTrackToPlaylist(currentPlaylistIdRef.current, trackItem);
    } catch { /* ignore — track may already exist in native playlist */ }
  }, [songToTrackItem]);

  useEffect(() => {
    if (!changedTrack) return;

    const skipAppend = justRebuiltRef.current;
    if (skipAppend) justRebuiltRef.current = false;

    const prev = currentSong;
    if (prev) {
      scrobbleIfNeeded(prev, {
        listenedSeconds: lastListenedSecondsRef.current,
        startTime: scrobbleStartTimeRef.current,
      });
    }

    if (nativeDirtyRef.current) {
      // Native queue is out of sync — calculate the correct next index
      // from the current virtual position (before this track change).
      const prevIdx = currentIndexRef.current;
      const nextIdx = getNextVirtualIndex(
        queueRef.current.length,
        prevIdx,
        repeatOnRef.current
      );

      if (nextIdx === -1) {
        // End of queue with no repeat — stop playback
        TrackPlayer.pause();
        return;
      }

      scrobbleStartTimeRef.current = Date.now();
      lastListenedSecondsRef.current = 0;
      updateCurrentIndex(nextIdx);
      setCurrentSong(queueRef.current[nextIdx]);

      // Rebuild to play the correct track
      rebuildNativePlayer(nextIdx);
      return;
    }

    // Clean path — the native track that started is correct
    const trackId = changedTrack.id;
    const newIndex = queueRef.current.findIndex(s => s.id === trackId);
    if (newIndex === -1) return;

    scrobbleStartTimeRef.current = Date.now();
    lastListenedSecondsRef.current = 0;
    updateCurrentIndex(newIndex);
    setCurrentSong(queueRef.current[newIndex]);

    // Preload the next track for gapless playback
    if (!skipAppend) {
      appendNextToNativePlayer(newIndex);
    }
  }, [changedTrack?.id]);

  const playSong = async (song: Song) => {
    queueRef.current = [song];
    originalQueueRef.current = null;
    setShuffleOn(false);
    updateCurrentIndex(0);
    bumpQueue();
    await rebuildNativePlayer(0, { clearScrobbleState: true });
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
    updateCurrentIndex(index);
    bumpQueue();
    await rebuildNativePlayer(index, { clearScrobbleState: true });
  };

  const addCollectionToQueue = async (collection: Album | Playlist) => {
    const existingIds = new Set(queueRef.current.map(s => s.id));
    const toAdd = collection.songs.filter(s => !existingIds.has(s.id));
    if (!toAdd.length) return;

    const prevLength = queueRef.current.length;
    queueRef.current = [...queueRef.current, ...toAdd];

    // If the "next" track position was affected (e.g. queue was at its end), mark dirty
    const nextIdx = getNextVirtualIndex(prevLength, currentIndexRef.current, repeatOnRef.current);
    if (nextIdx === -1 || nextIdx >= prevLength) {
      nativeDirtyRef.current = true;
    }

    bumpQueue();
  };

  const shuffleCollectionToQueue = async (collection: Album | Playlist) => {
    const existingIds = new Set(queueRef.current.map(s => s.id));
    const toAdd = shuffleArray(
      collection.songs.filter(s => !existingIds.has(s.id))
    );
    if (!toAdd.length) return;

    const prevLength = queueRef.current.length;
    queueRef.current = [...queueRef.current, ...toAdd];

    const nextIdx = getNextVirtualIndex(prevLength, currentIndexRef.current, repeatOnRef.current);
    if (nextIdx === -1 || nextIdx >= prevLength) {
      nativeDirtyRef.current = true;
    }

    bumpQueue();
  };

  const skipToNext = async () => {
    const nextIdx = getNextVirtualIndex(
      queueRef.current.length,
      currentIndexRef.current,
      repeatOnRef.current
    );
    if (nextIdx === -1) return;

    if (nativeDirtyRef.current) {
      // Native queue is stale — rebuild with the correct track
      updateCurrentIndex(nextIdx);
      await rebuildNativePlayer(nextIdx);
    } else {
      // Next track is already preloaded in native player — gapless skip
      TrackPlayer.skipToNext();
      // onChangeTrack will handle index update + preloading the next-next
    }
  };

  const skipToPrevious = async () => {
    const prevIdx = currentIndexRef.current - 1;
    if (prevIdx < 0) return;
    // Previous track is never in the 2-track native window — always rebuild
    updateCurrentIndex(prevIdx);
    await rebuildNativePlayer(prevIdx);
  };

  const skipTo = async (index: number) => {
    if (!queueRef.current[index]) return;
    // Target track is unlikely to be in the 2-track window — rebuild
    updateCurrentIndex(index);
    await rebuildNativePlayer(index);
  };

  const pauseSong = async () => {
    TrackPlayer.pause();
  };

  const resumeSong = async () => {
    TrackPlayer.play();
  };

  const getQueue = () => [...queueRef.current];

  const moveTrack = async (from: number, to: number) => {
    if (from === to) return;

    const q = [...queueRef.current];
    const [item] = q.splice(from, 1);
    q.splice(to, 0, item);
    queueRef.current = q;

    // Recalculate currentIndex after the reorder
    let newIdx = currentIndexRef.current;
    if (newIdx === from) newIdx = to;
    else if (from < newIdx && to >= newIdx) newIdx = newIdx - 1;
    else if (from > newIdx && to <= newIdx) newIdx = newIdx + 1;
    updateCurrentIndex(newIdx);

    // The native "next" track may have changed
    nativeDirtyRef.current = true;

    bumpQueue();
  };

  const addToQueue = async (song: Song) => {
    if (queueRef.current.some(s => s.id === song.id)) return;

    const prevLength = queueRef.current.length;
    queueRef.current = [...queueRef.current, song];

    // If this song becomes the next track (queue was at its end), mark dirty
    const nextIdx = getNextVirtualIndex(prevLength, currentIndexRef.current, repeatOnRef.current);
    if (nextIdx === -1 || nextIdx >= prevLength) {
      nativeDirtyRef.current = true;
    }

    bumpQueue();
  };

  const playNext = async (song: Song) => {
    if (!currentSong) return;
    const prevIdx = currentIndexRef.current;
    const removedIdx = queueRef.current.findIndex(s => s.id === song.id);
    const q = queueRef.current.filter(s => s.id !== song.id);

    // If the removed song was before currentIndex, shift down by 1
    const adjustedIdx = (removedIdx !== -1 && removedIdx < prevIdx) ? prevIdx - 1 : prevIdx;
    q.splice(adjustedIdx + 1, 0, song);
    queueRef.current = q;
    updateCurrentIndex(adjustedIdx);

    // The "next" track in native queue is now wrong
    nativeDirtyRef.current = true;

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

      await rebuildNativePlayer(0);
    } else if (originalQueueRef.current) {
      const original = originalQueueRef.current;
      const idx = original.findIndex(s => s.id === currentSong?.id);
      queueRef.current = original;
      updateCurrentIndex(idx);
      setShuffleOn(false);

      await rebuildNativePlayer(idx);
    }
    bumpQueue();
  };

  const toggleRepeat = () => {
    setRepeatOn(prev => {
      const newVal = !prev;
      repeatOnRef.current = newVal;
      // Mark dirty — the "next" track calculation changes with repeat mode
      nativeDirtyRef.current = true;
      return newVal;
    });
  };

  const resetQueue = async () => {
    lastScrobbledIdRef.current = null;
    scrobbleStartTimeRef.current = 0;
    lastListenedSecondsRef.current = 0;

    TrackPlayer.pause();

    if (currentPlaylistIdRef.current) {
      try { PlayerQueue.deletePlaylist(currentPlaylistIdRef.current); } catch { /* ignore */ }
      currentPlaylistIdRef.current = null;
    }

    queueRef.current = [];
    originalQueueRef.current = null;
    nativeDirtyRef.current = false;
    repeatOnRef.current = false;
    updateCurrentIndex(0);
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