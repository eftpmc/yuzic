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
  useActualQueue,
  useNowPlaying,
  useDownloadedTracks,
} from 'react-native-nitro-player';
import type { TrackItem } from 'react-native-nitro-player';
import { Album, Playlist, Song } from '@/types';
import shuffleArray from '@/utils/shuffleArray';
import { useApi } from '@/api';
import { buildCover } from '@/utils/builders/buildCover';
import { useDispatch, useSelector } from 'react-redux';
import { incrementPlay } from '@/utils/redux/slices/statsSlice';
import * as listenbrainz from '@/api/listenbrainz'
import type { RootState } from '@/utils/redux/store';
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

function isBufferingState(state: unknown): boolean {
  if (typeof state !== 'string') return false;
  const normalized = state.toLowerCase();
  return normalized.includes('buffer') || normalized === 'loading';
}

export interface PlaybackProgress {
  position: number;
  duration: number;
  buffered: number;
}

export interface PlayingContextType {
  currentSong: Song | null;
  isPlaying: boolean;
  playbackState: string | null;
  isBuffering: boolean;
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
  const isBuffering = isBufferingState(playbackState);
  const { queue: actualQueue, refreshQueue } = useActualQueue();
  const nowPlaying = useNowPlaying();

  const { position: rawPosition, totalDuration: rawDuration } = useOnPlaybackProgressChange();
  const progress: PlaybackProgress = {
    position: typeof rawPosition === 'number' && !Number.isNaN(rawPosition) ? rawPosition : 0,
    duration: typeof rawDuration === 'number' && !Number.isNaN(rawDuration) ? rawDuration : 0,
    buffered: 0,
  };

  const { track: changedTrack } = useOnChangeTrack();

  const api = useApi();
  const dispatch = useDispatch();
  const activeServer = useSelector((state: RootState) => {
    const { servers, activeServerId } = state.servers;
    if (!servers || !activeServerId) return null;
    return servers.find(s => s.id === activeServerId) ?? null;
  });
  const listenBrainzConfig = useSelector((state: RootState) => {
    const activeServerId = state.servers.activeServerId;
    if (!activeServerId) return null;
    const entry = state.listenbrainz.byServer[activeServerId];
    if (!entry?.username || !entry?.token) return null;
    return { username: entry.username, token: entry.token };
  });
  const offlineModeEnabled = useSelector(
    (state: RootState) => state.settings.offlineModeEnabled
  );
  const { isTrackDownloaded } = useDownloadedTracks();

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [repeatOn, setRepeatOn] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);
  const [queueVersion, setQueueVersion] = useState(0);

  const originalQueueRef = useRef<Song[] | null>(null);
  const currentPlaylistIdRef = useRef<string | null>(null);
  const queueOpTokenRef = useRef(0);
  const songByIdRef = useRef<Map<string, Song>>(new Map());
  const lastScrobbledIdRef = useRef<string | null>(null);
  const scrobbleStartTimeRef = useRef<number>(0);
  const lastListenedSecondsRef = useRef<number>(0);
  const currentSongRef = useRef<Song | null>(null);

  const bumpQueue = () => setQueueVersion(v => v + 1);

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

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    bumpQueue();
  }, [actualQueue]);

  useEffect(() => {
    if (typeof nowPlaying?.currentIndex === 'number' && nowPlaying.currentIndex >= 0) {
      setCurrentIndex(nowPlaying.currentIndex);
    } else {
      setCurrentIndex(0);
    }
  }, [nowPlaying?.currentIndex]);

  useEffect(() => {
    if (typeof nowPlaying?.currentPlaylistId === 'string') {
      currentPlaylistIdRef.current = nowPlaying.currentPlaylistId;
    } else if (nowPlaying?.currentPlaylistId === null) {
      currentPlaylistIdRef.current = null;
    }
  }, [nowPlaying?.currentPlaylistId]);

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
        serverId: song.sourceServerId ?? activeServer?.id ?? '',
        serverType: song.sourceServerType ?? activeServer?.type ?? '',
        coverKind: song.cover?.kind ?? '',
      },
    };
  }, [activeServer?.id, activeServer?.type]);

  const trackToSong = useCallback((track?: TrackItem | null): Song | null => {
    if (!track) return null;
    const known = songByIdRef.current.get(track.id);
    if (known) return known;
    return {
      id: track.id,
      title: track.title ?? '',
      artist: track.artist ?? '',
      artistId: String(track.extraPayload?.artistId ?? ''),
      cover: track.artwork ? { kind: 'url', url: track.artwork } : { kind: 'none' },
      duration: String(track.duration ?? 0),
      streamUrl: track.url ?? '',
      albumId: String(track.extraPayload?.albumId ?? ''),
      sourceServerId: String(track.extraPayload?.serverId ?? '') || undefined,
      sourceServerType:
        track.extraPayload?.serverType === 'navidrome' || track.extraPayload?.serverType === 'jellyfin'
          ? track.extraPayload.serverType
          : undefined,
    };
  }, []);

  const getNativeQueueSongs = useCallback((): Song[] => {
    return actualQueue
      .map(track => trackToSong(track))
      .filter((song): song is Song => song !== null);
  }, [actualQueue, trackToSong]);

  const runInBatches = useCallback(async (
    playlistId: string,
    songs: Song[],
    opToken: number,
    batchSize = 50
  ) => {
    for (let i = 0; i < songs.length; i += batchSize) {
      if (queueOpTokenRef.current !== opToken) return;
      const batch = songs.slice(i, i + batchSize);
      if (!batch.length) continue;
      const trackItems = await Promise.all(batch.map(songToTrackItem));
      if (queueOpTokenRef.current !== opToken) return;
      PlayerQueue.addTracksToPlaylist(playlistId, trackItems);
      refreshQueue();
      bumpQueue();
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }, [songToTrackItem, refreshQueue]);

  const replacePlaylist = useCallback(async (
    songs: Song[],
    startIndex: number,
    opts?: { clearScrobbleState?: boolean; progressive?: boolean }
  ) => {
    const safeStart = Math.max(0, Math.min(startIndex, Math.max(songs.length - 1, 0)));
    const opToken = ++queueOpTokenRef.current;

    if (opts?.clearScrobbleState) lastScrobbledIdRef.current = null;
    scrobbleStartTimeRef.current = Date.now();
    lastListenedSecondsRef.current = 0;

    for (const song of songs) {
      songByIdRef.current.set(song.id, song);
    }

    if (currentPlaylistIdRef.current) {
      try { PlayerQueue.deletePlaylist(currentPlaylistIdRef.current); } catch { /* ignore */ }
    }

    const playlistId = PlayerQueue.createPlaylist('Now Playing', '', '');
    currentPlaylistIdRef.current = playlistId;

    const progressive = opts?.progressive ?? false;
    const initialCount = progressive
      ? Math.max(25, safeStart + 1)
      : songs.length;
    const initialSongs = songs.slice(0, initialCount);
    const initialTracks = await Promise.all(initialSongs.map(songToTrackItem));
    PlayerQueue.addTracksToPlaylist(playlistId, initialTracks);

    PlayerQueue.loadPlaylist(playlistId);
    await TrackPlayer.skipToIndex(Math.min(safeStart, Math.max(initialSongs.length - 1, 0)));
    setCurrentSong(songs[safeStart] ?? null);
    setCurrentIndex(safeStart);
    await TrackPlayer.play();
    refreshQueue();
    bumpQueue();

    if (!progressive) return;
    const rest = songs.slice(initialCount);
    if (!rest.length) return;
    await runInBatches(playlistId, rest, opToken, 50);
  }, [songToTrackItem, refreshQueue, runInBatches]);

  useEffect(() => {
    const prev = currentSongRef.current;
    if (prev) {
      scrobbleIfNeeded(prev, {
        listenedSeconds: lastListenedSecondsRef.current,
        startTime: scrobbleStartTimeRef.current,
      });
    }

    if (!changedTrack) {
      setCurrentSong(null);
      return;
    }

    scrobbleStartTimeRef.current = Date.now();
    lastListenedSecondsRef.current = 0;
    setCurrentSong(trackToSong(changedTrack));
  }, [changedTrack?.id, trackToSong, scrobbleIfNeeded]);

  const playSong = async (song: Song) => {
    if (offlineModeEnabled && !isTrackDownloaded(song.id)) {
      toast.error(t('common.offline.downloadRequired'));
      return;
    }

    originalQueueRef.current = null;
    setShuffleOn(false);
    await replacePlaylist([song], 0, { clearScrobbleState: true, progressive: false });
  };

  const playSongInCollection = async (
    selectedSong: Song,
    collection: Album | Playlist,
    shuffle = false
  ) => {
    let songs = [...collection.songs];
    const selectedSongId = selectedSong.id;
    let index = 0;

    if (offlineModeEnabled) {
      songs = songs.filter(song => isTrackDownloaded(song.id));

      if (!songs.length) {
        toast.error(t('common.offline.noDownloadedTracks'));
        return;
      }
    }

    if (shuffle) {
      originalQueueRef.current = songs;
      songs = shuffleArray(songs);
      index = 0;
      setShuffleOn(true);
    } else {
      originalQueueRef.current = null;
      index = songs.findIndex(s => s.id === selectedSongId);
      setShuffleOn(false);
    }

    await replacePlaylist(songs, Math.max(index, 0), {
      clearScrobbleState: true,
      progressive: songs.length > 120,
    });
  };

  const addCollectionToQueue = async (collection: Album | Playlist) => {
    const collectionSongs = offlineModeEnabled
      ? collection.songs.filter(song => isTrackDownloaded(song.id))
      : collection.songs;

    if (!collectionSongs.length) {
      if (offlineModeEnabled) toast.error(t('common.offline.noDownloadedTracks'));
      return;
    }

    const playlistId = currentPlaylistIdRef.current;
    if (!playlistId) {
      const first = collectionSongs[0];
      if (first) {
        await playSongInCollection(first, { ...collection, songs: collectionSongs }, false);
      }
      return;
    }

    const existingIds = new Set(getNativeQueueSongs().map(s => s.id));
    const toAdd = collectionSongs.filter(s => !existingIds.has(s.id));
    if (!toAdd.length) return;

    for (const song of toAdd) {
      songByIdRef.current.set(song.id, song);
    }

    const opToken = ++queueOpTokenRef.current;
    await runInBatches(playlistId, toAdd, opToken, 50);
  };

  const shuffleCollectionToQueue = async (collection: Album | Playlist) => {
    const collectionSongs = offlineModeEnabled
      ? collection.songs.filter(song => isTrackDownloaded(song.id))
      : collection.songs;

    if (!collectionSongs.length) {
      if (offlineModeEnabled) toast.error(t('common.offline.noDownloadedTracks'));
      return;
    }

    const playlistId = currentPlaylistIdRef.current;
    if (!playlistId) {
      const first = collectionSongs[0];
      if (first) {
        await playSongInCollection(first, { ...collection, songs: collectionSongs }, true);
      }
      return;
    }

    const existingIds = new Set(getNativeQueueSongs().map(s => s.id));
    const toAdd = shuffleArray(
      collectionSongs.filter(s => !existingIds.has(s.id))
    );
    if (!toAdd.length) return;

    for (const song of toAdd) {
      songByIdRef.current.set(song.id, song);
    }

    const opToken = ++queueOpTokenRef.current;
    await runInBatches(playlistId, toAdd, opToken, 50);
  };

  const skipToNext = async () => {
    TrackPlayer.skipToNext();
  };

  const skipToPrevious = async () => {
    TrackPlayer.skipToPrevious();
  };

  const skipTo = async (index: number) => {
    const queue = getNativeQueueSongs();
    if (!queue[index]) return;
    await TrackPlayer.skipToIndex(index);
  };

  const pauseSong = async () => {
    TrackPlayer.pause();
  };

  const resumeSong = async () => {
    TrackPlayer.play();
  };

  const getQueue = () => getNativeQueueSongs();

  const moveTrack = async (from: number, to: number) => {
    if (from === to) return;
    const playlistId = currentPlaylistIdRef.current;
    if (!playlistId) return;

    const q = getNativeQueueSongs();
    if (!q[from] || !q[to]) return;
    const [item] = q.splice(from, 1);
    q.splice(to, 0, item);

    PlayerQueue.reorderTrackInPlaylist(playlistId, item.id, to);
    refreshQueue();
    bumpQueue();
  };

  const addToQueue = async (song: Song) => {
    if (offlineModeEnabled && !isTrackDownloaded(song.id)) {
      toast.error(t('common.offline.downloadRequired'));
      return;
    }

    const playlistId = currentPlaylistIdRef.current;
    if (!playlistId) {
      await playSong(song);
      return;
    }
    if (getNativeQueueSongs().some(s => s.id === song.id)) return;
    songByIdRef.current.set(song.id, song);
    PlayerQueue.addTrackToPlaylist(playlistId, await songToTrackItem(song));
    refreshQueue();
    bumpQueue();
  };

  const playNext = async (song: Song) => {
    if (offlineModeEnabled && !isTrackDownloaded(song.id)) {
      toast.error(t('common.offline.downloadRequired'));
      return;
    }

    const playlistId = currentPlaylistIdRef.current;
    if (!playlistId) {
      await playSong(song);
      return;
    }
    const queue = getNativeQueueSongs();
    if (!queue.length) {
      await playSong(song);
      return;
    }
    const idx = queue.findIndex(s => s.id === (currentSong?.id ?? ''));
    const currentIdx = idx >= 0 ? idx : currentIndex;
    const targetIdx = Math.min(currentIdx + 1, queue.length);

    songByIdRef.current.set(song.id, song);
    if (!queue.some(s => s.id === song.id)) {
      PlayerQueue.addTrackToPlaylist(playlistId, await songToTrackItem(song));
    }
    PlayerQueue.reorderTrackInPlaylist(playlistId, song.id, targetIdx);
    refreshQueue();
    bumpQueue();
  };

  const playSimilar = async (song: Song) => {
    if (offlineModeEnabled) {
      toast.error(t('common.offline.similarUnavailable'));
      return;
    }

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
    const queue = getNativeQueueSongs();
    if (!queue.length) return;

    if (!shuffleOn) {
      originalQueueRef.current = queue;
      const current = queue.find(s => s.id === currentSong?.id) ?? queue[currentIndex] ?? queue[0];
      const rest = queue.filter(s => s.id !== current.id);
      const shuffled = [current, ...shuffleArray(rest)];
      setShuffleOn(true);
      await replacePlaylist(shuffled, 0, { progressive: shuffled.length > 120 });
    } else if (originalQueueRef.current) {
      const original = originalQueueRef.current;
      const idx = original.findIndex(s => s.id === currentSong?.id);
      setShuffleOn(false);
      await replacePlaylist(original, Math.max(idx, 0), { progressive: original.length > 120 });
      originalQueueRef.current = null;
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

    ++queueOpTokenRef.current;
    TrackPlayer.pause();

    if (currentPlaylistIdRef.current) {
      try { PlayerQueue.deletePlaylist(currentPlaylistIdRef.current); } catch { /* ignore */ }
      currentPlaylistIdRef.current = null;
    }

    originalQueueRef.current = null;
    setCurrentIndex(0);
    setCurrentSong(null);
    setShuffleOn(false);
    setRepeatOn(false);
    TrackPlayer.setRepeatMode('off');
    refreshQueue();
    bumpQueue();
  };

  return (
    <PlayingContext.Provider
      value={{
        currentSong,
        isPlaying,
        playbackState: typeof playbackState === 'string' ? playbackState : null,
        isBuffering,
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
