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
import { areTrackIdsFullyDownloaded } from '@/utils/downloads/collectionState';

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

const SIMILAR_FETCH_TIMEOUT_MS = 2500;
const SIMILAR_MAX_SONGS = 80;
const QUEUE_WINDOW_BEFORE = 5;
const QUEUE_WINDOW_AFTER = 20;
const QUEUE_WINDOW_EDGE_BUFFER = 3;
const PENDING_SELECTION_TIMEOUT_MS = 1500;

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
    shuffle?: boolean,
    selectedIndex?: number
  ): Promise<void>;

  addCollectionToQueue(collection: Album | Playlist): Promise<void>;
  shuffleCollectionToQueue(collection: Album | Playlist): Promise<void>;

  skipTo(index: number): Promise<void>;
  selectQueueItem(index: number): Promise<void>;
  skipToNext(): Promise<void>;
  skipToPrevious(): Promise<void>;

  getQueue(): Song[];
  getQueueWindow(): { songs: Song[]; start: number };
  getQueueWindowStart(): number;
  getAbsoluteQueueIndex(songId: string): number;
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
  const queueSongsRef = useRef<Song[]>([]);
  const queueIndexByIdRef = useRef<Map<string, number>>(new Map());
  const queueWindowStartRef = useRef(0);
  const queueWindowEndRef = useRef(0);
  const transportQueueRef = useRef<Promise<void>>(Promise.resolve());
  const lastScrobbledIdRef = useRef<string | null>(null);
  const scrobbleStartTimeRef = useRef<number>(0);
  const lastListenedSecondsRef = useRef<number>(0);
  const currentSongRef = useRef<Song | null>(null);
  const pendingSelectSongIdRef = useRef<string | null>(null);
  const pendingSelectIndexRef = useRef(-1);
  const pendingSelectTokenRef = useRef(0);
  const pendingSelectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bumpQueue = () => setQueueVersion(v => v + 1);

  const clearPendingSelectionGuard = useCallback((token?: number) => {
    if (typeof token === 'number' && pendingSelectTokenRef.current !== token) return;
    pendingSelectSongIdRef.current = null;
    pendingSelectIndexRef.current = -1;
    if (pendingSelectTimeoutRef.current) {
      clearTimeout(pendingSelectTimeoutRef.current);
      pendingSelectTimeoutRef.current = null;
    }
  }, []);

  const armPendingSelectionGuard = useCallback((songId: string, index: number) => {
    const token = pendingSelectTokenRef.current + 1;
    pendingSelectTokenRef.current = token;
    pendingSelectSongIdRef.current = songId;
    pendingSelectIndexRef.current = index;
    if (pendingSelectTimeoutRef.current) {
      clearTimeout(pendingSelectTimeoutRef.current);
      pendingSelectTimeoutRef.current = null;
    }
    pendingSelectTimeoutRef.current = setTimeout(() => {
      if (pendingSelectTokenRef.current === token) {
        pendingSelectSongIdRef.current = null;
        pendingSelectIndexRef.current = -1;
        pendingSelectTimeoutRef.current = null;
      }
    }, PENDING_SELECTION_TIMEOUT_MS);
    return token;
  }, []);

  const songToFullTrackItem = useCallback((song: Song): TrackItem => {
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

  useEffect(() => {
    TrackPlayer.configure({
      androidAutoEnabled: true,
      carPlayEnabled: true,
      showInNotification: true,
      lookaheadCount: 5,
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
    return () => {
      if (pendingSelectTimeoutRef.current) {
        clearTimeout(pendingSelectTimeoutRef.current);
      }
    };
  }, []);

  const runTransportCommand = useCallback(async (
    command: () => Promise<void> | void
  ) => {
    transportQueueRef.current = transportQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await command();
      });
    await transportQueueRef.current;
  }, []);

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

  const rebuildIndexMap = useCallback((songs: Song[]) => {
    const map = new Map<string, number>();
    songs.forEach((s, i) => { if (!map.has(s.id)) map.set(s.id, i); });
    queueIndexByIdRef.current = map;
  }, []);

  const setJsQueue = useCallback((songs: Song[]) => {
    queueSongsRef.current = songs;
    rebuildIndexMap(songs);
    for (const song of songs) {
      songByIdRef.current.set(song.id, song);
    }
    bumpQueue();
  }, [rebuildIndexMap]);

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

  const getSimilarWithTimeout = useCallback(async (songId: string): Promise<Song[] | null> => {
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), SIMILAR_FETCH_TIMEOUT_MS);
    });

    return Promise.race([
      api.similar.getSimilarSongs(songId),
      timeoutPromise,
    ]);
  }, [api.similar]);

  const getNativeQueueSongs = useCallback((): Song[] => {
    return queueSongsRef.current;
  }, []);

  const getQueueIndexBySongId = useCallback((songId: string): number => {
    return queueIndexByIdRef.current.get(songId) ?? -1;
  }, []);

  const getAbsoluteQueueIndex = useCallback((songId: string): number => {
    if (!songId) return -1;
    const mapped = queueIndexByIdRef.current.get(songId);
    if (typeof mapped === 'number' && mapped >= 0) return mapped;
    return queueSongsRef.current.findIndex(song => song.id === songId);
  }, []);

  const getQueueWindowRange = useCallback((songs: Song[], centerIndex: number) => {
    if (!songs.length) return { start: 0, end: 0 };
    const safeCenter = Math.max(0, Math.min(centerIndex, songs.length - 1));
    const start = Math.max(0, safeCenter - QUEUE_WINDOW_BEFORE);
    const end = Math.min(songs.length, safeCenter + QUEUE_WINDOW_AFTER + 1);
    return { start, end };
  }, []);

  const updateQueueWindowRefs = useCallback((centerIndex: number): boolean => {
    const songs = queueSongsRef.current;
    if (!songs.length) {
      const changed = queueWindowStartRef.current !== 0 || queueWindowEndRef.current !== 0;
      queueWindowStartRef.current = 0;
      queueWindowEndRef.current = 0;
      return changed;
    }

    const currentStart = queueWindowStartRef.current;
    const currentEnd = queueWindowEndRef.current;
    const hasInitializedWindow = currentEnd > currentStart;
    if (!hasInitializedWindow) {
      const { start, end } = getQueueWindowRange(songs, centerIndex);
      queueWindowStartRef.current = start;
      queueWindowEndRef.current = end;
      return true;
    }

    const safeCenter = Math.max(0, Math.min(centerIndex, songs.length - 1));
    const leftThreshold = currentStart + QUEUE_WINDOW_EDGE_BUFFER;
    const rightThreshold = Math.max(currentStart, currentEnd - 1 - QUEUE_WINDOW_EDGE_BUFFER);
    const shouldShiftWindow = safeCenter < leftThreshold || safeCenter > rightThreshold;
    if (!shouldShiftWindow) return false;

    const { start, end } = getQueueWindowRange(songs, safeCenter);
    const changed = start !== currentStart || end !== currentEnd;
    queueWindowStartRef.current = start;
    queueWindowEndRef.current = end;
    return changed;
  }, [getQueueWindowRange]);

  const isCollectionFullyDownloaded = useCallback((collection: Album | Playlist): boolean => {
    const collectionTrackIds = collection.songs
      .map(song => String(song.id))
      .filter(Boolean);
    const downloadedCollectionTrackIds = new Set(
      collectionTrackIds.filter(trackId => isTrackDownloaded(trackId))
    );
    return areTrackIdsFullyDownloaded(collectionTrackIds, downloadedCollectionTrackIds);
  }, [isTrackDownloaded]);

  const replacePlaylist = useCallback(async (
    songs: Song[],
    startIndex: number,
    opts?: { clearScrobbleState?: boolean }
  ) => {
    if (!songs.length) {
      clearPendingSelectionGuard();
      setJsQueue([]);
      setCurrentSong(null);
      setCurrentIndex(0);
      return;
    }

    if (startIndex < 0 || startIndex >= songs.length) {
      toast.error(t('common.error.unexpected'));
      return;
    }

    const safeStart = startIndex;
    const opToken = ++queueOpTokenRef.current;
    const isStaleOperation = () => queueOpTokenRef.current !== opToken;
    const cleanupPlaylistIfStale = (playlistId: string) => {
      if (!isStaleOperation()) return;
      try { PlayerQueue.deletePlaylist(playlistId); } catch { /* ignore */ }
      if (currentPlaylistIdRef.current === playlistId) {
        currentPlaylistIdRef.current = null;
      }
    };

    if (opts?.clearScrobbleState) lastScrobbledIdRef.current = null;
    scrobbleStartTimeRef.current = Date.now();
    lastListenedSecondsRef.current = 0;
    const pendingToken = armPendingSelectionGuard(songs[safeStart].id, safeStart);

    setJsQueue(songs);
    setCurrentSong(songs[safeStart] ?? null);
    setCurrentIndex(safeStart);

    if (currentPlaylistIdRef.current) {
      try { PlayerQueue.deletePlaylist(currentPlaylistIdRef.current); } catch { /* ignore */ }
    }
    if (isStaleOperation()) return;

    const playlistId = PlayerQueue.createPlaylist('Now Playing', '', '');
    currentPlaylistIdRef.current = playlistId;
    if (isStaleOperation()) {
      cleanupPlaylistIfStale(playlistId);
      return;
    }

    const tracks = songs.map(songToFullTrackItem);
    PlayerQueue.addTracksToPlaylist(playlistId, tracks);
    if (isStaleOperation()) {
      cleanupPlaylistIfStale(playlistId);
      return;
    }

    await runTransportCommand(async () => {
      if (isStaleOperation()) return;
      await TrackPlayer.pause();
      if (isStaleOperation()) return;
      PlayerQueue.loadPlaylist(playlistId);
      if (isStaleOperation()) return;
      await TrackPlayer.skipToIndex(safeStart);
      if (isStaleOperation()) return;
      await TrackPlayer.play();
    });
    if (isStaleOperation()) {
      clearPendingSelectionGuard(pendingToken);
      cleanupPlaylistIfStale(playlistId);
    }
  }, [
    armPendingSelectionGuard,
    clearPendingSelectionGuard,
    songToFullTrackItem,
    setJsQueue,
    runTransportCommand,
    t,
  ]);

  useEffect(() => {
    const prev = currentSongRef.current;
    if (prev) {
      scrobbleIfNeeded(prev, {
        listenedSeconds: lastListenedSecondsRef.current,
        startTime: scrobbleStartTimeRef.current,
      });
    }

    const pendingSongId = pendingSelectSongIdRef.current;
    const pendingIndex = pendingSelectIndexRef.current;

    if (!changedTrack) {
      if (pendingSongId) return;
      setCurrentSong(null);
      return;
    }

    if (pendingSongId) {
      const changedId = changedTrack.id;
      const changedIndex = queueIndexByIdRef.current.get(changedId) ?? -1;
      const matchesPending =
        changedId === pendingSongId ||
        (pendingIndex >= 0 && changedIndex === pendingIndex);
      if (!matchesPending) return;
      clearPendingSelectionGuard();
    }

    scrobbleStartTimeRef.current = Date.now();
    lastListenedSecondsRef.current = 0;

    const jsSong = songByIdRef.current.get(changedTrack.id);
    setCurrentSong(jsSong ?? trackToSong(changedTrack));

    const idx = queueIndexByIdRef.current.get(changedTrack.id) ?? -1;
    if (idx >= 0) {
      setCurrentIndex(idx);
    }
  }, [
    changedTrack?.id,
    clearPendingSelectionGuard,
    trackToSong,
    scrobbleIfNeeded,
    songToFullTrackItem,
  ]);

  useEffect(() => {
    if (updateQueueWindowRefs(currentIndex)) {
      bumpQueue();
    }
  }, [currentIndex, updateQueueWindowRefs]);

  const playSong = async (song: Song) => {
    if (offlineModeEnabled && !isTrackDownloaded(song.id)) {
      toast.error(t('common.offline.downloadRequired'));
      return;
    }

    originalQueueRef.current = null;
    setShuffleOn(false);
    await replacePlaylist([song], 0, { clearScrobbleState: true });
  };

  const playSongInCollection = async (
    selectedSong: Song,
    collection: Album | Playlist,
    shuffle = false,
    selectedIndex?: number
  ) => {
    let songs = [...collection.songs];
    let index = 0;

    if (offlineModeEnabled && !isCollectionFullyDownloaded(collection)) {
      toast.error(t('common.offline.noDownloadedTracks'));
      return;
    }

    if (shuffle) {
      originalQueueRef.current = songs;
      songs = shuffleArray(songs);
      index = 0;
      setShuffleOn(true);
    } else {
      originalQueueRef.current = null;
      if (typeof selectedIndex === 'number') {
        index = selectedIndex;
      } else {
        index = songs.findIndex(s => s.id === selectedSong.id);
      }
      setShuffleOn(false);
    }

    if (index < 0 || index >= songs.length) {
      toast.error(t('common.error.unexpected'));
      return;
    }

    await replacePlaylist(songs, index, { clearScrobbleState: true });
  };

  const addCollectionToQueue = async (collection: Album | Playlist) => {
    if (offlineModeEnabled && !isCollectionFullyDownloaded(collection)) {
      toast.error(t('common.offline.noDownloadedTracks'));
      return;
    }
    const collectionSongs = collection.songs;

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

    const existingIds = new Set(queueSongsRef.current.map(s => s.id));
    const toAdd = collectionSongs.filter(s => !existingIds.has(s.id));
    if (!toAdd.length) return;

    const newQueue = [...queueSongsRef.current, ...toAdd];
    setJsQueue(newQueue);

    PlayerQueue.addTracksToPlaylist(playlistId, toAdd.map(songToFullTrackItem));
  };

  const shuffleCollectionToQueue = async (collection: Album | Playlist) => {
    if (offlineModeEnabled && !isCollectionFullyDownloaded(collection)) {
      toast.error(t('common.offline.noDownloadedTracks'));
      return;
    }
    const collectionSongs = collection.songs;

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

    const existingIds = new Set(queueSongsRef.current.map(s => s.id));
    const toAdd = shuffleArray(
      collectionSongs.filter(s => !existingIds.has(s.id))
    );
    if (!toAdd.length) return;

    const newQueue = [...queueSongsRef.current, ...toAdd];
    setJsQueue(newQueue);

    PlayerQueue.addTracksToPlaylist(playlistId, toAdd.map(songToFullTrackItem));
  };

  const skipToNext = async () => {
    await runTransportCommand(async () => {
      await TrackPlayer.skipToNext();
    });
  };

  const skipToPrevious = async () => {
    await runTransportCommand(async () => {
      await TrackPlayer.skipToPrevious();
    });
  };

  const skipTo = async (index: number) => {
    const queue = queueSongsRef.current;
    if (!queue[index]) return;
    await runTransportCommand(async () => {
      await TrackPlayer.skipToIndex(index);
    });
  };

  const selectQueueItem = async (index: number) => {
    const queue = queueSongsRef.current;
    if (!queue[index]) return;
    const targetSong = queue[index];
    const activeIndex = typeof nowPlaying?.currentIndex === 'number'
      ? nowPlaying.currentIndex
      : currentIndex;
    const activeSongId = currentSongRef.current?.id ?? currentSong?.id ?? '';
    if (activeIndex === index && activeSongId === targetSong.id) return;

    await replacePlaylist([...queue], index);
  };

  const pauseSong = async () => {
    await runTransportCommand(async () => {
      await TrackPlayer.pause();
    });
  };

  const resumeSong = async () => {
    await runTransportCommand(async () => {
      await TrackPlayer.play();
    });
  };

  const getQueueWindow = () => {
    const songs = getNativeQueueSongs();
    const { start, end } = getQueueWindowRange(songs, currentIndex);
    queueWindowStartRef.current = start;
    queueWindowEndRef.current = end;
    return {
      songs: songs.slice(start, end),
      start,
    };
  };

  const getQueue = () => {
    return getQueueWindow().songs;
  };

  const getQueueWindowStart = () => {
    return getQueueWindow().start;
  };

  const moveTrack = async (from: number, to: number) => {
    if (from === to) return;
    const playlistId = currentPlaylistIdRef.current;
    if (!playlistId) return;

    const q = [...queueSongsRef.current];
    if (!q[from] || !q[to]) return;
    const [item] = q.splice(from, 1);
    q.splice(to, 0, item);
    setJsQueue(q);

    PlayerQueue.reorderTrackInPlaylist(playlistId, item.id, to);
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
    if (queueSongsRef.current.some(s => s.id === song.id)) return;

    setJsQueue([...queueSongsRef.current, song]);
    PlayerQueue.addTrackToPlaylist(playlistId, songToFullTrackItem(song));
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
    const queue = [...queueSongsRef.current];
    if (!queue.length) {
      await playSong(song);
      return;
    }
    const idx = getQueueIndexBySongId(currentSong?.id ?? '');
    const currentIdx = idx >= 0 ? idx : currentIndex;
    const targetIdx = Math.min(currentIdx + 1, queue.length);

    const alreadyInQueue = queue.some(s => s.id === song.id);
    if (!alreadyInQueue) {
      queue.splice(targetIdx, 0, song);
    } else {
      const oldIdx = queue.findIndex(s => s.id === song.id);
      queue.splice(oldIdx, 1);
      const insertAt = Math.min(targetIdx, queue.length);
      queue.splice(insertAt, 0, song);
    }
    setJsQueue(queue);

    if (!alreadyInQueue) {
      PlayerQueue.addTrackToPlaylist(playlistId, songToFullTrackItem(song));
    }
    PlayerQueue.reorderTrackInPlaylist(playlistId, song.id, targetIdx);
  };

  const playSimilar = async (song: Song) => {
    if (offlineModeEnabled) {
      toast.error(t('common.offline.similarUnavailable'));
      return;
    }

    try {
      const similarSongs = await getSimilarWithTimeout(song.id);
      if (!similarSongs) {
        await playSong(song);
        return;
      }

      const others = shuffleArray(
        similarSongs.filter(s => s.id !== song.id)
      ).slice(0, Math.max(SIMILAR_MAX_SONGS - 1, 0));
      const songs = [song, ...others];

      if (songs.length <= 1) {
        await playSong(song);
        return;
      }

      await replacePlaylist(songs, 0, { clearScrobbleState: true });
      toast.success(t('common.playingSimilar'));
    } catch {
      await playSong(song);
    }
  };

  const toggleShuffle = async () => {
    const queue = queueSongsRef.current;
    if (!queue.length) return;

    if (!shuffleOn) {
      originalQueueRef.current = [...queue];
      const current = queue.find(s => s.id === currentSong?.id) ?? queue[currentIndex] ?? queue[0];
      const rest = queue.filter(s => s.id !== current.id);
      const shuffled = [current, ...shuffleArray(rest)];
      setShuffleOn(true);
      await replacePlaylist(shuffled, 0);
    } else if (originalQueueRef.current) {
      const original = originalQueueRef.current;
      const idx = original.findIndex(s => s.id === currentSong?.id);
      setShuffleOn(false);
      await replacePlaylist(original, Math.max(idx, 0));
      originalQueueRef.current = null;
    }
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
    await runTransportCommand(async () => {
      await TrackPlayer.pause();
    });

    if (currentPlaylistIdRef.current) {
      try { PlayerQueue.deletePlaylist(currentPlaylistIdRef.current); } catch { /* ignore */ }
      currentPlaylistIdRef.current = null;
    }

    originalQueueRef.current = null;
    songByIdRef.current.clear();
    queueSongsRef.current = [];
    queueIndexByIdRef.current = new Map();
    setCurrentIndex(0);
    setCurrentSong(null);
    setShuffleOn(false);
    setRepeatOn(false);
    TrackPlayer.setRepeatMode('off');
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
        getQueueWindow,
        getQueueWindowStart,
        getAbsoluteQueueIndex,
        resetQueue,
        skipTo,
        selectQueueItem,
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
