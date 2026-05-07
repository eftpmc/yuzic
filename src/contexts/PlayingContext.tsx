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
  BrowseCategory,
  BrowseItem,
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
import { buildCover } from '@/utils/builders/buildCover';
import { useDispatch, useSelector } from 'react-redux';
import { incrementPlay } from '@/utils/redux/slices/statsSlice';
import * as listenbrainz from '@/api/listenbrainz';
import * as lastfm from '@/api/lastfm';
import * as navidromeScrobble from '@/api/navidrome/scrobble';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import {
  selectListenBrainzConfig,
  selectListenBrainzScrobbleEnabled,
  selectListenBrainzNowPlayingEnabled,
} from '@/utils/redux/selectors/listenbrainzSelectors';
import {
  selectLastFmConfig,
  selectLastFmScrobbleEnabled,
  selectLastFmNowPlayingEnabled,
} from '@/utils/redux/selectors/lastfmSelectors';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTranslation } from 'react-i18next';
import { moveSongAfterCurrent } from './playingQueue';
import { useDownload } from './DownloadContext';
import { useLibrary } from './LibraryContext';

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

let playerWasSetup = false;

export const usePlaying = () => {
  const ctx = useContext(PlayingContext);
  if (!ctx) throw new Error('usePlaying must be used within PlayingProvider');
  return ctx;
};

export const usePlayingProgress = () => useContext(PlayingProgressContext);

const toPlayableBrowseItem = (song: Song): BrowseItem | null => {
  if (!song.streamUrl) return null;
  return {
    mediaId: song.id,
    title: song.title,
    artist: song.artist,
    artworkUrl: buildCover(song.cover, 'grid') ?? undefined,
    url: song.streamUrl,
    duration: Number(song.duration) || undefined,
  };
};

const toMediaItems = (songs: Song[]): MediaItem[] => songs.map(buildTrackItem);

export const PlayingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const isPlaying = useIsPlaying();
  const { position, duration, buffered } = useProgress(1);
  const activeMediaItem = useActiveMediaItem();
  const progress = useMemo<PlaybackProgress>(() => ({
    position: typeof position === 'number' && !Number.isNaN(position) ? position : 0,
    duration: typeof duration === 'number' && !Number.isNaN(duration) ? duration : 0,
    buffered: typeof buffered === 'number' && !Number.isNaN(buffered) ? buffered : 0,
  }), [position, duration, buffered]);

  const api = useApi();
  const { getLocalPath } = useDownload();
  const { albums, playlists, starred } = useLibrary();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const listenBrainzConfig = useSelector(selectListenBrainzConfig);
  const lbScrobbleEnabled = useSelector(selectListenBrainzScrobbleEnabled);
  const lbNowPlayingEnabled = useSelector(selectListenBrainzNowPlayingEnabled);
  const lastFmConfig = useSelector(selectLastFmConfig);
  const lastFmScrobbleEnabled = useSelector(selectLastFmScrobbleEnabled);
  const lastFmNowPlayingEnabled = useSelector(selectLastFmNowPlayingEnabled);

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
  const isPlayingRef = useRef(false);
  const isShufflingRef = useRef(false);
  const scrobbleIfNeededRef = useRef<(
    song: Song | null,
    opts: { listenedSeconds: number; startTime: number }
  ) => Promise<void>>(async () => {});

  const bumpQueue = useCallback(() => setQueueVersion(v => v + 1), []);

  useEffect(() => { repeatOnRef.current = repeatOn; }, [repeatOn]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

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
      } catch {
        playerWasSetup = true;
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

  useEffect(() => {
    if (progress.position > 0) {
      lastListenedSecondsRef.current = Math.floor(progress.position);
    }
  }, [progress.position]);

  const librarySongById = useMemo(() => {
    const map = new Map<string, Song>();
    albums.forEach(album => album.songs?.forEach(song => map.set(song.id, song)));
    playlists.forEach(playlist => playlist.songs?.forEach(song => map.set(song.id, song)));
    starred.forEach(song => map.set(song.id, song));
    return map;
  }, [albums, playlists, starred]);

  useEffect(() => {
    const categories: BrowseCategory[] = [];

    const favoriteItems = starred
      .slice(0, 100)
      .map(toPlayableBrowseItem)
      .filter((item): item is BrowseItem => Boolean(item));
    if (favoriteItems.length) {
      categories.push({
        mediaId: 'favorites',
        title: 'Favorites',
        items: favoriteItems,
      });
    }

    const albumItems = albums
      .filter(album => album.songs?.length)
      .slice(0, 50)
      .map((album): BrowseItem => ({
        mediaId: `album-${album.id}`,
        title: album.title,
        artist: album.artist.name,
        artworkUrl: buildCover(album.cover, 'grid') ?? undefined,
        children: album.songs
          .slice(0, 100)
          .map(toPlayableBrowseItem)
          .filter((item): item is BrowseItem => Boolean(item)),
      }))
      .filter(item => item.children?.length);
    if (albumItems.length) {
      categories.push({
        mediaId: 'albums',
        title: 'Albums',
        items: albumItems,
      });
    }

    const playlistItems = playlists
      .filter(playlist => playlist.songs?.length)
      .slice(0, 50)
      .map((playlist): BrowseItem => ({
        mediaId: `playlist-${playlist.id}`,
        title: playlist.title,
        artworkUrl: buildCover(playlist.cover, 'grid') ?? undefined,
        children: playlist.songs
          .slice(0, 100)
          .map(toPlayableBrowseItem)
          .filter((item): item is BrowseItem => Boolean(item)),
      }))
      .filter(item => item.children?.length);
    if (playlistItems.length) {
      categories.push({
        mediaId: 'playlists',
        title: 'Playlists',
        items: playlistItems,
      });
    }

    try {
      TrackPlayer.setBrowseTree(categories.slice(0, 4));
    } catch {
      // Browse tree updates are best-effort and should never block app playback.
    }
  }, [albums, playlists, starred]);

  const scrobbleIfNeeded = useCallback(async (
    song: Song | null,
    opts: { listenedSeconds: number; startTime: number }
  ) => {
    if (!song) return;
    if (lastScrobbledIdRef.current === song.id) return;
    const songDuration = Number(song.duration) || 0;
    if (!passesScrobbleThreshold(opts.listenedSeconds, songDuration)) return;
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
    if (listenBrainzConfig?.token && lbScrobbleEnabled) {
      try {
        await listenbrainz.submitScrobble(listenBrainzConfig, {
          artist: song.artist,
          track: song.title,
          listenedAt: Math.floor(opts.startTime / 1000),
          durationSeconds: songDuration > 0 ? songDuration : undefined,
          durationPlayedSeconds: opts.listenedSeconds,
        });
      } catch (err) {
        console.warn('ListenBrainz scrobble failed', err);
      }
    }
    if (lastFmConfig && lastFmScrobbleEnabled) {
      try {
        await lastfm.submitScrobble(lastFmConfig, {
          artist: song.artist,
          track: song.title,
          timestamp: Math.floor(opts.startTime / 1000),
          duration: songDuration > 0 ? songDuration : undefined,
        });
      } catch (err) {
        console.warn('LastFM scrobble failed', err);
      }
    }
  }, [activeServer, listenBrainzConfig, lbScrobbleEnabled, lastFmConfig, lastFmScrobbleEnabled, dispatch, api]);

  useEffect(() => {
    scrobbleIfNeededRef.current = scrobbleIfNeeded;
  }, [scrobbleIfNeeded]);

  const resolvePlayableSong = useCallback((song: Song): Song => {
    const localPath = getLocalPath(song.id);
    return localPath ? { ...song, streamUrl: localPath } : song;
  }, [getLocalPath]);

  const loadQueue = useCallback(async (songs: Song[], startIndex: number, play = true) => {
    lastScrobbledIdRef.current = null;
    scrobbleStartTimeRef.current = Date.now();
    lastListenedSecondsRef.current = 0;
    TrackPlayer.setMediaItems(toMediaItems(songs), startIndex);
    if (repeatOnRef.current) TrackPlayer.setRepeatMode(RepeatMode.All);
    if (play) TrackPlayer.play();
  }, []);

  useEffect(() => {
    const mediaId = activeMediaItem?.mediaId;
    if (!mediaId) return;

    const prev = currentSongRef.current;
    if (prev && prev.id !== mediaId) {
      scrobbleIfNeededRef.current(prev, {
        listenedSeconds: lastListenedSecondsRef.current,
        startTime: scrobbleStartTimeRef.current,
      });
      scrobbleStartTimeRef.current = Date.now();
      lastListenedSecondsRef.current = 0;
    }

    let newIndex = queueRef.current.findIndex(s => s.id === mediaId);
    let songFromQueue = newIndex >= 0 ? queueRef.current[newIndex] : librarySongById.get(mediaId);

    if (!songFromQueue && activeMediaItem.url) {
      songFromQueue = {
        id: mediaId,
        title: activeMediaItem.title ?? '',
        artist: activeMediaItem.artist ?? '',
        albumId: '',
        artistId: '',
        duration: String(activeMediaItem.duration ?? 0),
        streamUrl: String(activeMediaItem.url),
        cover: { kind: 'none' },
        isPreview: false,
      } as Song;
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

    const songDuration = Number(songFromQueue.duration) || undefined;
    if (listenBrainzConfig?.token && lbNowPlayingEnabled) {
      listenbrainz.submitNowPlaying(listenBrainzConfig, {
        artist: songFromQueue.artist,
        track: songFromQueue.title,
        durationSeconds: songDuration,
      }).catch(() => {});
    }
    if (lastFmConfig && lastFmNowPlayingEnabled) {
      lastfm.updateNowPlaying(lastFmConfig, {
        artist: songFromQueue.artist,
        track: songFromQueue.title,
        duration: songDuration,
      }).catch(() => {});
    }
  }, [activeMediaItem, bumpQueue, librarySongById, listenBrainzConfig, lbNowPlayingEnabled, lastFmConfig, lastFmNowPlayingEnabled]);

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
    await loadQueue([playableSong], 0);
  }, [bumpQueue, loadQueue, resolvePlayableSong]);

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
    await loadQueue(songs, index);
  }, [bumpQueue, loadQueue, resolvePlayableSong]);

  const addCollectionToQueue = useCallback((collection: Album | Playlist) => {
    const existingIds = new Set(queueRef.current.map(s => s.id));
    const toAdd = collection.songs
      .filter(s => !existingIds.has(s.id))
      .map(resolvePlayableSong);
    if (!toAdd.length) return;
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
    queueRef.current = [...queueRef.current, ...toAdd];
    TrackPlayer.addMediaItems(toMediaItems(toAdd));
    bumpQueue();
  }, [bumpQueue, resolvePlayableSong]);

  const skipToNext = useCallback(async () => {
    await scrobbleIfNeeded(currentSongRef.current, {
      listenedSeconds: lastListenedSecondsRef.current,
      startTime: scrobbleStartTimeRef.current,
    });
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx >= queueRef.current.length && !repeatOnRef.current) return;
    TrackPlayer.skipToNext();
    if (isPlayingRef.current) TrackPlayer.play();
  }, [scrobbleIfNeeded]);

  const skipToPrevious = useCallback(async () => {
    await scrobbleIfNeeded(currentSongRef.current, {
      listenedSeconds: lastListenedSecondsRef.current,
      startTime: scrobbleStartTimeRef.current,
    });
    if (currentIndexRef.current <= 0) return;
    TrackPlayer.skipToIndex(currentIndexRef.current - 1);
    if (isPlayingRef.current) TrackPlayer.play();
  }, [scrobbleIfNeeded]);

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
    TrackPlayer.skipToIndex(index);
    if (isPlayingRef.current) TrackPlayer.play();
  }, [scrobbleIfNeeded]);

  const pauseSong = useCallback(async () => {
    TrackPlayer.pause();
  }, []);

  const resumeSong = useCallback(async () => {
    TrackPlayer.play();
  }, []);

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
    if (queueRef.current.some(s => s.id === playableSong.id)) return;
    queueRef.current = [...queueRef.current, playableSong];
    TrackPlayer.addMediaItem(buildTrackItem(playableSong));
    bumpQueue();
  }, [bumpQueue, resolvePlayableSong]);

  const playNext = useCallback((song: Song) => {
    if (!currentSongRef.current) return;
    const playableSong = resolvePlayableSong(song);
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
    const savedPosition = lastListenedSecondsRef.current;
    try {
      if (!shuffleOn) {
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
  }, [bumpQueue, loadQueue, shuffleOn]);

  const toggleRepeat = useCallback(() => {
    setRepeatOn(prev => {
      const next = !prev;
      TrackPlayer.setRepeatMode(next ? RepeatMode.All : RepeatMode.Off);
      return next;
    });
  }, []);

  const resetQueue = useCallback(async () => {
    await scrobbleIfNeeded(currentSongRef.current, {
      listenedSeconds: lastListenedSecondsRef.current,
      startTime: scrobbleStartTimeRef.current,
    });
    lastScrobbledIdRef.current = null;
    scrobbleStartTimeRef.current = 0;
    lastListenedSecondsRef.current = 0;
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
  }, [bumpQueue, scrobbleIfNeeded]);

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
