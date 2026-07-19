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
  PlaybackState,
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
import { moveSongAfterCurrent, reconcileUnshuffledQueue, QueueSegment, tagSegment, shiftSegmentsAfterInsert } from './playingQueue';
import { resolvePlaybackErrorAction } from './playbackErrorRecovery';
import { useDownloadActions } from './DownloadContext';
import { useCast } from './CastContext';
import { useScrobbling } from '@/hooks/useScrobbling';
import { useCarPlayBrowseTree } from '@/hooks/useCarPlayBrowseTree';
import { useSelector } from 'react-redux';
import {
  selectWifiStreamQuality,
  selectCellularStreamQuality,
  selectPreferredCodec,
  selectAutoplayEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import { selectIsAudiomuseConfigured, selectAudiomuseConfig } from '@/utils/redux/selectors/audiomuseSelectors';
import { useNetworkType } from '@/hooks/useNetworkType';
import {
  QueueFillProvider,
  createNativeSimilarityQueueFillProvider,
  createAudiomuseQueueFillProvider,
  resolveQueueFillProvider,
} from './queueProviders';

// How many tracks of runway remain before Autoplay fetches more.
const LOW_WATERMARK = 3;

export interface PlaybackProgress {
  position: number;
  duration: number;
  buffered: number;
}

export type RepeatModeState = 'off' | 'all' | 'one';

// off -> shuffle -> smart -> off, matching the shuffle button's tap cycle.
// 'smart' reorders and blends in tracks from outside the original selection
// (via the tiered AudioMuse/native provider); Autoplay is the separate,
// shuffle-mode-independent feature that extends the queue once it runs out.
export type ShuffleMode = 'off' | 'shuffle' | 'smart';

export interface PlayingStateType {
  currentSong: Song | null;
  isPlaying: boolean;
  isBuffering: boolean;
  currentIndex: number;
  queueVersion: number;
  /** @deprecated use repeatMode instead */
  repeatOn: boolean;
  repeatMode: RepeatModeState;
  shuffleMode: ShuffleMode;
  playbackSpeed: number;
  setCurrentSong(song: Song | null): void;
}

export interface PlayingActionsType {
  pauseSong(): Promise<void>;
  resumeSong(): Promise<void>;
  seekSong(positionSeconds: number): void;
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
  cycleShuffleMode(): Promise<void>;
  toggleRepeat(): void;
  setPlaybackSpeed(speed: number): void;
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
  if (typeof item.url === 'object' && item.url && 'uri' in item.url) {
    return typeof item.url.uri === 'string' ? item.url.uri : '';
  }
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

function playableSongsOnly(songs: Song[]): Song[] {
  return songs.filter(hasPlayableMediaUrl);
}

export const PlayingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const isPlaying = useIsPlaying();
  const activeMediaItem = useActiveMediaItem();
  const api = useApi();
  const { getLocalPath } = useDownloadActions();
  const { activeDevice, castPause, castResume, castSeek } = useCast();
  const networkType = useNetworkType();
  const wifiQuality = useSelector(selectWifiStreamQuality);
  const cellularQuality = useSelector(selectCellularStreamQuality);
  const streamQuality = networkType === 'wifi' ? wifiQuality
    : networkType === 'cellular' ? cellularQuality
    : 'high';
  const streamQualityRef = useRef(streamQuality);
  streamQualityRef.current = streamQuality;
  const preferredCodec = useSelector(selectPreferredCodec);
  const preferredCodecRef = useRef(preferredCodec);
  preferredCodecRef.current = preferredCodec;
  const autoplayEnabled = useSelector(selectAutoplayEnabled);
  const isAudiomuseConfigured = useSelector(selectIsAudiomuseConfigured);
  const audiomuseConfig = useSelector(selectAudiomuseConfig);

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatModeState>('off');
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>('off');
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
  const [queueVersion, setQueueVersion] = useState(0);

  const queueRef = useRef<Song[]>([]);
  const queueSegmentsRef = useRef<QueueSegment[]>([]);
  const originalQueueRef = useRef<Song[] | null>(null);
  const scrobbleStartTimeRef = useRef<number>(0);
  const currentIndexRef = useRef(0);
  const currentSongRef = useRef<Song | null>(null);
  const repeatModeRef = useRef<RepeatModeState>('off');
  const shuffleModeRef = useRef<ShuffleMode>('off');
  const autoplayEnabledRef = useRef(false);
  const isPlayingRef = useRef(false);
  const isShufflingRef = useRef(false);
  const isFillingRef = useRef(false);
  const lastPlaybackErrorAtRef = useRef(0);
  const providersRef = useRef<QueueFillProvider[]>([]);
  const fillQueueIfLowRef = useRef<() => Promise<void>>(async () => {});

  // Stable refs to latest callbacks — avoids stale closures in effects without listing
  // volatile deps, while keeping the callbacks themselves stable for context consumers.
  const scrobbleIfNeededRef = useRef<(
    song: Song | null,
    opts: { listenedSeconds: number; startTime: number }
  ) => Promise<void>>(async () => {});
  const submitNowPlayingRef = useRef<(song: Song) => void>(() => {});
  const removeFailedCurrentTrackRef = useRef<() => void>(() => {});
  const resolvePlayableSongRef = useRef<(song: Song) => Song>((s) => s);

  const { scrobbleIfNeeded, submitNowPlaying, resetLastScrobbled } = useScrobbling();

  useEffect(() => { scrobbleIfNeededRef.current = scrobbleIfNeeded; }, [scrobbleIfNeeded]);
  useEffect(() => { submitNowPlayingRef.current = submitNowPlaying; }, [submitNowPlaying]);
  useEffect(() => { repeatModeRef.current = repeatMode; }, [repeatMode]);
  useEffect(() => { shuffleModeRef.current = shuffleMode; }, [shuffleMode]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { autoplayEnabledRef.current = autoplayEnabled; }, [autoplayEnabled]);

  // AudioMuse-AI first when configured, native similar-songs as fallback —
  // covers both Autoplay's queue-end extension and Smart Shuffle's injection.
  useEffect(() => {
    const providers: QueueFillProvider[] = [];
    if (isAudiomuseConfigured) providers.push(createAudiomuseQueueFillProvider(audiomuseConfig, api));
    providers.push(createNativeSimilarityQueueFillProvider(api));
    providersRef.current = providers;
  }, [isAudiomuseConfigured, audiomuseConfig, api]);

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
        PlayerCommand.SkipForward,
        PlayerCommand.SkipBackward,
      ],
      handling: 'native',
    });
  }, []);

  const bumpQueue = useCallback(() => setQueueVersion(v => v + 1), []);

  const clearPlaybackState = useCallback(() => {
    queueRef.current = [];
    queueSegmentsRef.current = [];
    originalQueueRef.current = null;
    currentIndexRef.current = 0;
    currentSongRef.current = null;
    setCurrentIndex(0);
    setCurrentSong(null);
    setShuffleMode('off');
    bumpQueue();
    TrackPlayer.stop();
    TrackPlayer.clear();
  }, [bumpQueue]);

  const removeFailedCurrentTrack = useCallback(() => {
    const failedIndex = currentIndexRef.current;
    const currentQueue = queueRef.current;

    if (currentQueue.length <= 1 || failedIndex < 0 || failedIndex >= currentQueue.length) {
      clearPlaybackState();
      return;
    }

    const nextQueue = currentQueue.filter((_, index) => index !== failedIndex);
    const nextIndex = Math.min(failedIndex, nextQueue.length - 1);
    const nextSong = nextQueue[nextIndex] ?? null;

    queueRef.current = nextQueue;
    originalQueueRef.current = originalQueueRef.current
      ? originalQueueRef.current.filter(song => song.id !== currentQueue[failedIndex]?.id)
      : null;
    currentIndexRef.current = nextIndex;
    currentSongRef.current = nextSong;
    setCurrentIndex(nextIndex);
    setCurrentSong(nextSong);
    bumpQueue();

    TrackPlayer.removeMediaItem(failedIndex);
    if (nextSong) {
      TrackPlayer.skipToIndex(nextIndex);
      TrackPlayer.play();
    }
  }, [bumpQueue, clearPlaybackState]);
  removeFailedCurrentTrackRef.current = removeFailedCurrentTrack;

  // Id of the track we've already attempted one URL-refresh retry for. Keyed by
  // song id rather than a time window — a wall-clock gate breaks when a failure
  // (e.g. an unreachable server) takes longer than the window to surface, which
  // makes every retry look like a "first" attempt and loops forever.
  const lastRecoveryAttemptedIdRef = useRef<string | null>(null);

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

      const now = Date.now();

      // Preview URLs (Deezer etc.) can't be refreshed — remove immediately.
      if (song?.isPreview) {
        removeFailedCurrentTrackRef.current();
        return;
      }

      // First failure for this specific track: refresh every URL in the queue
      // (catches stale Navidrome tokens after JS context restarts) then retry.
      const decision = resolvePlaybackErrorAction(lastRecoveryAttemptedIdRef.current, song?.id);
      if (decision.action === 'retry') {
        lastRecoveryAttemptedIdRef.current = decision.nextLastRecoveryAttemptedId;
        const freshQueue = queueRef.current.map(s => resolvePlayableSongRef.current(s));
        queueRef.current = freshQueue;
        currentSongRef.current = freshQueue[currentIndexRef.current] ?? song;
        TrackPlayer.setMediaItems(toMediaItems(freshQueue), currentIndexRef.current);
        TrackPlayer.play();
        return;
      }

      // This track failed again after a retry — URL refresh didn't help, genuine failure.
      if (now - lastPlaybackErrorAtRef.current > 1500) {
        lastPlaybackErrorAtRef.current = now;
        toast.error(t('common.playbackError'));
      }

      removeFailedCurrentTrackRef.current();
    });

    return () => subscription.remove();
  }, [t]);

  useEffect(() => {
    const subscription = TrackPlayer.addEventListener(Event.PlaybackStateChanged, ({ state }) => {
      setIsBuffering(state === PlaybackState.Buffering);
    });
    return () => subscription.remove();
  }, []);

  // Build a song lookup map from the library for queue reconciliation
  const librarySongByIdRef = useRef<Map<string, Song>>(new Map());

  // Track changes: reconcile native queue, update current song, fire now-playing + scrobble
  useEffect(() => {
    const mediaId = activeMediaItem?.mediaId;
    if (!mediaId) return;

    // A media item is only reported active once it's actually playing, so this
    // track is no longer in the "just retried once" state from the error handler.
    lastRecoveryAttemptedIdRef.current = null;

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
        // Prefer in-memory queue (fresh URLs) over native cache (potentially stale tokens)
        const known = queueRef.current.find(song => song.id === id)
          ?? librarySongByIdRef.current.get(id);
        if (known) return known;
        // Fallback: build from native item, then immediately refresh the URL
        const fallback = mediaItemToFallbackSong(item);
        return fallback ? resolvePlayableSongRef.current(fallback) : null;
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

    const remaining = queueRef.current.length - 1 - newIndex;
    if (autoplayEnabledRef.current && remaining <= LOW_WATERMARK && !isFillingRef.current) {
      void fillQueueIfLowRef.current();
    }
  }, [activeMediaItem, bumpQueue]);

  const resolvePlayableSong = useCallback((song: Song): Song => {
    if (song.isPreview) return song;
    const localPath = getLocalPath(song.id);
    if (localPath) return { ...song, streamUrl: localPath };
    const freshUrl = api.songs.buildStreamUrl(song.id, streamQualityRef.current, preferredCodecRef.current);
    return freshUrl ? { ...song, streamUrl: freshUrl } : song;
  }, [api, getLocalPath]);
  // Keep ref in sync during render so effects/handlers always have the latest version
  resolvePlayableSongRef.current = resolvePlayableSong;

  const loadQueue = useCallback(async (songs: Song[], startIndex: number, play = true, seekToPosition?: number) => {
    assertPlayableSongs(songs);
    resetLastScrobbled();
    scrobbleStartTimeRef.current = Date.now();
    TrackPlayer.setMediaItems(toMediaItems(songs), startIndex);
    TrackPlayer.setRepeatMode(
      repeatModeRef.current === 'all' ? RepeatMode.All :
      repeatModeRef.current === 'one' ? RepeatMode.One :
      RepeatMode.Off
    );
    if (seekToPosition !== undefined && seekToPosition > 0) TrackPlayer.seekTo(seekToPosition);
    if (play) TrackPlayer.play();
  }, [resetLastScrobbled]);

  // Autoplay: fetches more tracks once the queue is running low, regardless
  // of shuffle mode. Independent of Smart Shuffle — see injectSmartShuffleTracks.
  const fillQueueIfLow = useCallback(async () => {
    if (isFillingRef.current) return;
    isFillingRef.current = true;
    try {
      const provider = resolveQueueFillProvider(providersRef.current);
      if (!provider) return;
      const recentSongs = queueRef.current.slice(Math.max(0, currentIndexRef.current - 5), currentIndexRef.current + 1);
      const excludeIds = new Set(queueRef.current.map(s => s.id));
      const extension = await provider.fetchExtension({ recentSongs, excludeIds, count: 10 });
      const playable = playableSongsOnly(extension.map(resolvePlayableSongRef.current));
      if (!playable.length) return;
      const insertAt = queueRef.current.length;
      queueRef.current = [...queueRef.current, ...playable];
      queueSegmentsRef.current = tagSegment(queueSegmentsRef.current, insertAt, playable.length, {
        kind: 'autoplay-fill',
        contextId: `autoplay-${insertAt}`,
      });
      TrackPlayer.addMediaItems(toMediaItems(playable));
      bumpQueue();
    } catch (err) {
      console.warn('Autoplay fill failed', err);
    } finally {
      isFillingRef.current = false;
    }
  }, [bumpQueue]);
  useEffect(() => { fillQueueIfLowRef.current = fillQueueIfLow; }, [fillQueueIfLow]);

  // Smart Shuffle's one-shot injection: fetches related tracks and shuffles
  // them into the remainder of the queue (everything after the current
  // track), keeping the already-played prefix untouched.
  const injectSmartShuffleTracks = useCallback(async (wasPlaying: boolean, savedPosition: number) => {
    try {
      const provider = resolveQueueFillProvider(providersRef.current);
      if (!provider) return;
      const recentSongs = queueRef.current.slice(Math.max(0, currentIndexRef.current - 5), currentIndexRef.current + 1);
      const excludeIds = new Set(queueRef.current.map(s => s.id));
      const extension = await provider.fetchExtension({ recentSongs, excludeIds, count: 10 });
      const playable = playableSongsOnly(extension.map(resolvePlayableSongRef.current));
      if (!playable.length) return;
      const before = queueRef.current.slice(0, currentIndexRef.current + 1);
      const after = queueRef.current.slice(currentIndexRef.current + 1);
      const merged = shuffleArray([...after, ...playable]);
      const fullQueue = [...before, ...merged];
      queueRef.current = fullQueue;
      queueSegmentsRef.current = [{
        startIndex: 0,
        length: fullQueue.length,
        source: { kind: 'user', contextId: 'smart-shuffled', contextType: 'adhoc' },
      }];
      bumpQueue();
      await loadQueue(fullQueue, currentIndexRef.current, wasPlaying, savedPosition);
    } catch (err) {
      console.warn('Smart Shuffle inject failed', err);
    }
  }, [bumpQueue, loadQueue]);

  const playSong = useCallback(async (song: Song) => {
    const playableSong = resolvePlayableSong(song);
    assertPlayableSongs([playableSong]);
    queueRef.current = [playableSong];
    queueSegmentsRef.current = [{
      startIndex: 0,
      length: 1,
      source: { kind: 'user', contextId: playableSong.id, contextType: 'adhoc' },
    }];
    originalQueueRef.current = null;
    setShuffleMode('off');
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
    let songs = playableSongsOnly(collection.songs.map(resolvePlayableSong));
    if (!songs.length) throw new Error(`Collection has no playable media URLs: ${collection.id}`);
    let index = 0;
    const selectedPlayableSong = resolvePlayableSong(selectedSong);
    if (!hasPlayableMediaUrl(selectedPlayableSong)) {
      throw new Error(`Track has no playable media URL: ${selectedSong.id}`);
    }

    const contextType: 'album' | 'playlist' = 'year' in collection ? 'album' : 'playlist';

    if (shuffle) {
      originalQueueRef.current = songs;
      songs = shuffleArray(songs);
      setShuffleMode('shuffle');
    } else {
      originalQueueRef.current = null;
      index = songs.findIndex(s => s.id === selectedSong.id);
      if (index === -1) index = 0;
      setShuffleMode('off');
    }

    queueRef.current = songs;
    queueSegmentsRef.current = [{
      startIndex: 0,
      length: songs.length,
      source: { kind: 'user', contextId: collection.id, contextType },
    }];
    currentIndexRef.current = index;
    setCurrentIndex(index);
    currentSongRef.current = songs[index];
    setCurrentSong(songs[index]);
    bumpQueue();
    await loadQueue(songs, index);
  }, [bumpQueue, loadQueue, resolvePlayableSong]);

  const addCollectionToQueue = useCallback((collection: Album | Playlist) => {
    const existingIds = new Set(queueRef.current.map(s => s.id));
    const toAdd = playableSongsOnly(collection.songs
      .filter(s => !existingIds.has(s.id))
      .map(resolvePlayableSong));
    if (!toAdd.length) return;
    const insertAt = queueRef.current.length;
    queueRef.current = [...queueRef.current, ...toAdd];
    queueSegmentsRef.current = tagSegment(queueSegmentsRef.current, insertAt, toAdd.length, {
      kind: 'user',
      contextId: collection.id,
      contextType: 'year' in collection ? 'album' : 'playlist',
    });
    TrackPlayer.addMediaItems(toMediaItems(toAdd));
    bumpQueue();
  }, [bumpQueue, resolvePlayableSong]);

  const shuffleCollectionToQueue = useCallback((collection: Album | Playlist) => {
    const existingIds = new Set(queueRef.current.map(s => s.id));
    const toAdd = shuffleArray(playableSongsOnly(
      collection.songs
        .filter(s => !existingIds.has(s.id))
        .map(resolvePlayableSong)
    ));
    if (!toAdd.length) return;
    const insertAt = queueRef.current.length;
    queueRef.current = [...queueRef.current, ...toAdd];
    queueSegmentsRef.current = tagSegment(queueSegmentsRef.current, insertAt, toAdd.length, {
      kind: 'user',
      contextId: collection.id,
      contextType: 'year' in collection ? 'album' : 'playlist',
    });
    TrackPlayer.addMediaItems(toMediaItems(toAdd));
    bumpQueue();
  }, [bumpQueue, resolvePlayableSong]);

  const skipToNext = useCallback(async () => {
    await scrobbleIfNeededRef.current(currentSongRef.current, {
      listenedSeconds: Math.floor(TrackPlayer.getProgress().position),
      startTime: scrobbleStartTimeRef.current,
    });
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx >= queueRef.current.length && repeatModeRef.current !== 'all') return;
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

  const pauseSong = useCallback(async () => {
    TrackPlayer.pause();
    if (activeDevice) castPause();
  }, [activeDevice, castPause]);

  const resumeSong = useCallback(async () => {
    TrackPlayer.play();
    if (activeDevice) castResume();
  }, [activeDevice, castResume]);

  const seekSong = useCallback((positionSeconds: number) => {
    TrackPlayer.seekTo(positionSeconds);
    if (activeDevice) castSeek(positionSeconds);
  }, [activeDevice, castSeek]);

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
    const insertAt = queueRef.current.length;
    queueRef.current = [...queueRef.current, playableSong];
    queueSegmentsRef.current = tagSegment(queueSegmentsRef.current, insertAt, 1, {
      kind: 'user',
      contextId: playableSong.id,
      contextType: 'adhoc',
    });
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
      queueSegmentsRef.current = tagSegment(
        shiftSegmentsAfterInsert(queueSegmentsRef.current, update.insertIndex, 1),
        update.insertIndex,
        1,
        { kind: 'user', contextId: playableSong.id, contextType: 'adhoc' },
      );
    }
    queueRef.current = update.queue;
    currentIndexRef.current = update.currentIndex;
    setCurrentIndex(update.currentIndex);
    bumpQueue();
  }, [bumpQueue, resolvePlayableSong]);

  // AudioMuse-AI first when configured, native similar-songs as fallback —
  // same tiered provider Autoplay and Smart Shuffle use, so "Play Similar"
  // gets acoustic similarity too instead of always hitting the native API.
  const playSimilar = useCallback(async (song: Song) => {
    try {
      const provider = resolveQueueFillProvider(providersRef.current);
      const similarSongs = provider
        ? await provider.fetchExtension({ recentSongs: [song], excludeIds: new Set([song.id]), count: 20 })
        : await api.similar.getSimilarSongs(song.id);
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

  // Cycles off -> shuffle -> smart -> off, matching the shuffle button's tap
  // behavior. 'smart' keeps the shuffled order from the previous step and
  // additionally injects related tracks via injectSmartShuffleTracks; it does
  // not re-snapshot originalQueueRef, so turning shuffle off from 'smart'
  // still restores the pre-shuffle queue (reconciled for any live edits).
  const cycleShuffleMode = useCallback(async () => {
    if (isShufflingRef.current) return;
    isShufflingRef.current = true;
    const wasPlaying = isPlayingRef.current;
    const savedPosition = TrackPlayer.getProgress().position;
    const current = shuffleModeRef.current;
    try {
      if (current === 'off') {
        originalQueueRef.current = queueRef.current;
        const currentSong = queueRef.current[currentIndexRef.current];
        const rest = queueRef.current.filter((_, i) => i !== currentIndexRef.current);
        const shuffled = [currentSong, ...shuffleArray(rest)].filter(Boolean);
        queueRef.current = shuffled;
        queueSegmentsRef.current = [{
          startIndex: 0,
          length: shuffled.length,
          source: { kind: 'user', contextId: 'shuffled', contextType: 'adhoc' },
        }];
        currentIndexRef.current = 0;
        setCurrentIndex(0);
        setShuffleMode('shuffle');
        bumpQueue();
        await loadQueue(shuffled, 0, wasPlaying, savedPosition);
      } else if (current === 'shuffle') {
        setShuffleMode('smart');
        bumpQueue();
        await injectSmartShuffleTracks(wasPlaying, savedPosition);
      } else if (originalQueueRef.current) {
        // addToQueue/playNext/addCollectionToQueue/etc. only ever mutate the
        // live (shuffled) queueRef, never the pre-shuffle snapshot — restoring
        // that snapshot verbatim would silently drop anything added while
        // shuffled, and resurrect anything removed (e.g. a failed track).
        // Anything Smart Shuffle injected isn't in the snapshot either, so it
        // survives here too — appended after the restored original order.
        const original = reconcileUnshuffledQueue(originalQueueRef.current, queueRef.current);
        const currentId = currentSongRef.current?.id;
        const idx = currentId ? original.findIndex(s => s.id === currentId) : 0;
        const adjustedIdx = idx === -1 ? 0 : idx;
        queueRef.current = original;
        queueSegmentsRef.current = [{
          startIndex: 0,
          length: original.length,
          source: { kind: 'user', contextId: 'restored', contextType: 'adhoc' },
        }];
        currentIndexRef.current = adjustedIdx;
        setCurrentIndex(adjustedIdx);
        setShuffleMode('off');
        originalQueueRef.current = null;
        bumpQueue();
        await loadQueue(original, adjustedIdx, wasPlaying, savedPosition);
      } else {
        setShuffleMode('off');
        bumpQueue();
      }
    } finally {
      isShufflingRef.current = false;
    }
  }, [bumpQueue, loadQueue, injectSmartShuffleTracks]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode(prev => {
      const next: RepeatModeState = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off';
      TrackPlayer.setRepeatMode(
        next === 'all' ? RepeatMode.All :
        next === 'one' ? RepeatMode.One :
        RepeatMode.Off
      );
      return next;
    });
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed);
    TrackPlayer.setPlaybackSpeed(speed);
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
    queueSegmentsRef.current = [];
    originalQueueRef.current = null;
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    currentSongRef.current = null;
    setCurrentSong(null);
    setShuffleMode('off');
    setRepeatMode('off');
    TrackPlayer.setRepeatMode(RepeatMode.Off);
    bumpQueue();
  }, [bumpQueue, resetLastScrobbled]);

  const stateValue = useMemo<PlayingStateType>(() => ({
    currentSong,
    isPlaying,
    isBuffering,
    currentIndex,
    queueVersion,
    repeatOn: repeatMode !== 'off',
    repeatMode,
    shuffleMode,
    playbackSpeed,
    setCurrentSong,
  }), [currentSong, isPlaying, isBuffering, currentIndex, queueVersion, repeatMode, shuffleMode, playbackSpeed]);

  // All callbacks are stable (deps are empty or other stable values via refs),
  // so actionsValue almost never changes after mount — action-only consumers
  // are immune to track/play/index changes.
  const actionsValue = useMemo<PlayingActionsType>(() => ({
    pauseSong,
    resumeSong,
    seekSong,
    playSong,
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    skipTo,
    skipToNext,
    skipToPrevious,
    getQueue,
    resetQueue,
    cycleShuffleMode,
    toggleRepeat,
    setPlaybackSpeed,
    moveTrack,
    addToQueue,
    playNext,
    playSimilar,
  }), [
    pauseSong,
    resumeSong,
    seekSong,
    playSong,
    playSongInCollection,
    addCollectionToQueue,
    shuffleCollectionToQueue,
    skipTo,
    skipToNext,
    skipToPrevious,
    getQueue,
    resetQueue,
    cycleShuffleMode,
    toggleRepeat,
    setPlaybackSpeed,
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
