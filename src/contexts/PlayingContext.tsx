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

  const bumpQueue = () => setQueueVersion(v => v + 1);

  useEffect(() => {
    TrackPlayer.configure({
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

  const loadPlaylistAndPlay = useCallback(async (
    songs: Song[],
    startIndex: number,
    opts?: { clearScrobbleState?: boolean }
  ) => {
    if (opts?.clearScrobbleState) lastScrobbledIdRef.current = null;
    scrobbleStartTimeRef.current = Date.now();
    lastListenedSecondsRef.current = 0;

    if (currentPlaylistIdRef.current) {
      try { PlayerQueue.deletePlaylist(currentPlaylistIdRef.current); } catch { /* ignore */ }
    }

    const playlistId = PlayerQueue.createPlaylist('Now Playing', '', '');
    currentPlaylistIdRef.current = playlistId;

    const trackItems = await Promise.all(songs.map(songToTrackItem));
    PlayerQueue.addTracksToPlaylist(playlistId, trackItems);

    PlayerQueue.loadPlaylist(playlistId);
    await TrackPlayer.skipToIndex(startIndex)

    setCurrentSong(songs[startIndex]);
    await TrackPlayer.play();
  }, [songToTrackItem]);

  useEffect(() => {
    if (!changedTrack) return;

    const prev = currentSong;
    if (prev) {
      scrobbleIfNeeded(prev, {
        listenedSeconds: lastListenedSecondsRef.current,
        startTime: scrobbleStartTimeRef.current,
      });
    }

    const trackId = changedTrack.id;
    const newIndex = queueRef.current.findIndex(s => s.id === trackId);
    if (newIndex === -1) return;

    scrobbleStartTimeRef.current = Date.now();
    lastListenedSecondsRef.current = 0;
    setCurrentIndex(newIndex);
    setCurrentSong(queueRef.current[newIndex]);
  }, [changedTrack?.id]);

  const playSong = async (song: Song) => {
    queueRef.current = [song];
    originalQueueRef.current = null;
    setShuffleOn(false);
    setCurrentIndex(0);
    bumpQueue();
    await loadPlaylistAndPlay([song], 0, { clearScrobbleState: true });
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
    setCurrentIndex(index);
    bumpQueue();
    await loadPlaylistAndPlay(songs, index, { clearScrobbleState: true });
  };

  const addCollectionToQueue = async (collection: Album | Playlist) => {
    const existingIds = new Set(queueRef.current.map(s => s.id));
    const toAdd = collection.songs.filter(s => !existingIds.has(s.id));
    if (!toAdd.length) return;
    queueRef.current = [...queueRef.current, ...toAdd];

    if (currentPlaylistIdRef.current) {
      const trackItems = await Promise.all(toAdd.map(songToTrackItem));
      PlayerQueue.addTracksToPlaylist(currentPlaylistIdRef.current, trackItems);
    }

    bumpQueue();
  };

  const shuffleCollectionToQueue = async (collection: Album | Playlist) => {
    const existingIds = new Set(queueRef.current.map(s => s.id));
    const toAdd = shuffleArray(
      collection.songs.filter(s => !existingIds.has(s.id))
    );
    if (!toAdd.length) return;
    queueRef.current = [...queueRef.current, ...toAdd];

    if (currentPlaylistIdRef.current) {
      const trackItems = await Promise.all(toAdd.map(songToTrackItem));
      PlayerQueue.addTracksToPlaylist(currentPlaylistIdRef.current, trackItems);
    }

    bumpQueue();
  };

  const skipToNext = async () => {
    TrackPlayer.skipToNext();
  };

  const skipToPrevious = async () => {
    TrackPlayer.skipToPrevious();
  };

  const skipTo = async (index: number) => {
    if (!queueRef.current[index]) return;
    const song = queueRef.current[index];
    if (currentPlaylistIdRef.current) {
      await TrackPlayer.playSong(song.id, currentPlaylistIdRef.current);
    }
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

    if (currentPlaylistIdRef.current) {
      PlayerQueue.reorderTrackInPlaylist(currentPlaylistIdRef.current, item.id, to);
    }

    setCurrentIndex(prev => {
      if (prev === from) return to;
      if (from < prev && to >= prev) return prev - 1;
      if (from > prev && to <= prev) return prev + 1;
      return prev;
    });

    bumpQueue();
  };

  const addToQueue = async (song: Song) => {
    if (queueRef.current.some(s => s.id === song.id)) return;
    queueRef.current = [...queueRef.current, song];

    if (currentPlaylistIdRef.current) {
      const trackItem = await songToTrackItem(song);
      PlayerQueue.addTrackToPlaylist(currentPlaylistIdRef.current, trackItem);
    }

    bumpQueue();
  };

  const playNext = async (song: Song) => {
    if (!currentSong) return;
    const q = queueRef.current.filter(s => s.id !== song.id);
    q.splice(currentIndex + 1, 0, song);
    queueRef.current = q;

    if (currentPlaylistIdRef.current) {
      const trackItem = await songToTrackItem(song);
      PlayerQueue.addTrackToPlaylist(currentPlaylistIdRef.current, trackItem);
      PlayerQueue.reorderTrackInPlaylist(currentPlaylistIdRef.current, song.id, currentIndex + 1);
    }

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
      const current = queueRef.current[currentIndex];
      const rest = queueRef.current.filter((_, i) => i !== currentIndex);
      const shuffled = [current, ...shuffleArray(rest)];
      queueRef.current = shuffled;
      setCurrentIndex(0);
      setShuffleOn(true);

      await loadPlaylistAndPlay(shuffled, 0);
    } else if (originalQueueRef.current) {
      const original = originalQueueRef.current;
      const idx = original.findIndex(s => s.id === currentSong?.id);
      queueRef.current = original;
      setCurrentIndex(idx);
      setShuffleOn(false);

      await loadPlaylistAndPlay(original, idx);
    }
    bumpQueue();
  };

  const toggleRepeat = () => {
    setRepeatOn(prev => {
      const newVal = !prev;
      TrackPlayer.setRepeatMode(newVal ? 'Playlist' : 'off');
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
