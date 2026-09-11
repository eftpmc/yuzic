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
import type { MediaItem } from '../features/player/mediaItem';
import { getBackend } from '@/features/player/activeBackend';
import { presetToBands } from '@/features/player/audioSettings';
import {
  usePlayerActiveItem,
  usePlayerIsPlaying,
  usePlayerProgress,
} from '@/features/player/usePlayerState';

import { Album, Playlist, Song, SongBase } from '@/types';
import shuffleArray from '@/utils/shuffleArray';
import { useApi } from '@/api';
import { buildTrackItem } from '@/utils/builders/buildTrackItem';
import { mediaHeadersForSong } from '@/features/player/mediaHeaders';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTranslation } from 'react-i18next';
import { moveSongAfterCurrent, reconcileUnshuffledQueue, QueueSegment, segmentAt, tagSegment, shiftSegmentsAfterInsert } from './playingQueue';
import { isRepeatLoop } from './repeatPlay';
import { resolvePlaybackErrorAction } from './playbackErrorRecovery';
import { useDownloadActions } from './DownloadContext';
import { usePlaybackSink } from './PlaybackSinkContext';
import { ownsPlayback } from '@/features/player/playbackSink';
import { useScrobbling } from '@/hooks/useScrobbling';
import { useCarPlayBrowseTree } from '@/hooks/useCarPlayBrowseTree';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectPreferredCodec,
  selectAutoplayEnabled,
  selectCrossfadeSeconds,
  selectCrossfadeAlways,
  selectEqualizerGains,
  selectPlaybackSpeeds,
} from '@/utils/redux/selectors/settingsSelectors';
import { selectIsAudiomuseConfigured, selectAudiomuseConfig } from '@/utils/redux/selectors/audiomuseSelectors';
import { useStreamQuality } from '@/hooks/useStreamQuality';
import { playableQuality } from '@/utils/audio/playableFormat';
import {
  QueueFillProvider,
  createNativeSimilarityQueueFillProvider,
  createAudiomuseQueueFillProvider,
  resolveQueueFillProvider,
} from './queueProviders';
import {
  assertPlayableSongs,
  getMediaItemId,
  getSourceKind,
  hasPlayableMediaUrl,
  hasSameQueueIds,
  mediaItemToFallbackSong,
  playableSongsOnly,
} from './playableMedia';
import { buildFillRequest, shouldFillQueue } from './autoplayFill';
import { buildRestoredQueue } from './restoreQueue';
import { canFillQueueFrom } from '@/utils/playback/contentKind';
import { clampSpeed, speedFor, speedProfileFor } from '@/utils/playback/speedProfile';
import { streamSourceId } from '@/utils/playback/streamId';
import { setPlaybackSpeedForProfile } from '@/utils/redux/slices/settingsSlice';
import { useBookmarkManager } from '@/hooks/useBookmarkManager';
import { useQueueSync } from '@/hooks/useQueueSync';
import { usePlaybackPersistence } from '@/hooks/usePlaybackPersistence';
import {
  selectPersistedPlaybackActiveServerId,
  selectPersistedPlaybackCurrentIndex,
  selectPersistedPlaybackPositionMs,
  selectPersistedPlaybackQueue,
  selectPersistedPlaybackRepeatMode,
  selectPersistedPlaybackShuffleMode,
} from '@/utils/redux/selectors/playbackSelectors';
import { selectActiveServerId as selectActiveServerIdSel, selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectLibraryTracks } from '@/utils/redux/selectors/librarySelectors';
import { clampStartIndex, trimQueueAroundIndex } from './adhocQueue';



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
  /** @deprecated use repeatMode instead */
  repeatOn: boolean;
  repeatMode: RepeatModeState;
  shuffleMode: ShuffleMode;
  playbackSpeed: number;
  /** Player volume 0..1 (independent of the device's system volume). */
  volume: number;
  setCurrentSong(song: Song | null): void;
}

export interface PlayingActionsType {
  pauseSong(): Promise<void>;
  resumeSong(): Promise<void>;
  seekSong(positionSeconds: number): void;
  /**
   * Seeks by `deltaSeconds` from the current position, clamped into the track.
   * Positive jumps forward, negative jumps back. Runs against the live
   * TrackPlayer position rather than any subscribed state, so callers stay
   * unsubscribed from the per-second progress ticks.
   */
  jumpBy(deltaSeconds: number): void;
  playSong(song: Song): Promise<void>;
  playSongInCollection(
    selectedSong: Song,
    collection: Album | Playlist,
    shuffle?: boolean
  ): Promise<void>;
  /** Plays an arbitrary list of songs — a library screen, a genre, a filter —
   * rather than an album or playlist. */
  playSongs(
    songs: (Song | SongBase)[],
    options?: { startIndex?: number; shuffle?: boolean; contextId?: string }
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
  /** Sets the in-app player volume 0..1. Clamped; doesn't touch device volume. */
  setVolume(volume: number): void;
}

// Combined type kept for backward compat
export type PlayingContextType = PlayingStateType & PlayingActionsType;

const PlayingStateContext = createContext<PlayingStateType | undefined>(undefined);
const PlayingActionsContext = createContext<PlayingActionsType | undefined>(undefined);
const PlayingProgressContext = createContext<PlaybackProgress>({ position: 0, duration: 0, buffered: 0 });
// Split out of PlayingStateType: queueVersion bumps on every queue mutation
// (add/remove/reorder/autoplay-fill), which is far more often than most
// usePlayingState() consumers (the full-screen player, the mini bar, Controls)
// need to re-render for. Only the queue list itself reads this.
const PlayingQueueVersionContext = createContext<number>(0);

/**
 * Whether the player has been set up this launch.
 *
 * Module-level rather than a `useRef` so it survives a remount of the
 * provider: `setup()` claims the audio session and subscribes the event
 * listener, and doing that twice would rebuild the audio graph underneath a
 * playing track.
 *
 * This was briefly a `Set` keyed by which backend, back when there were two
 * and switching between them left the incoming one un-set-up — a plain
 * boolean was already true from the outgoing player, so `setup()` never ran
 * on the new one and the engine sat silent. With one player the key has
 * nothing to distinguish, so it is a boolean again.
 */
const playerSetUp = { current: false };

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
export const usePlayingQueueVersion = () => useContext(PlayingQueueVersionContext);

// Separate component so useProgress ticks don't rerender PlayingProvider.
const PlayingProgressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { position, duration, buffered } = usePlayerProgress(1);
  // Whoever holds the audio holds the clock. With the jukebox selected the
  // local player is stopped, so `useProgress` sits at zero and the bar would
  // never move — the server's polled position is the real one. Duration still
  // comes from the track: the jukebox reports where it is, not how long the
  // song is, and nothing is buffered on this device at all.
  const { jukeboxState } = usePlaybackSink();
  const { currentSong } = usePlayingState();

  const progress = useMemo<PlaybackProgress>(() => {
    if (jukeboxState) {
      const songDuration = Number(currentSong?.duration) || 0;
      return { position: jukeboxState.positionSeconds, duration: songDuration, buffered: 0 };
    }
    return {
      position: typeof position === 'number' && !Number.isNaN(position) ? position : 0,
      duration: typeof duration === 'number' && !Number.isNaN(duration) ? duration : 0,
      buffered: typeof buffered === 'number' && !Number.isNaN(buffered) ? buffered : 0,
    };
  }, [position, duration, buffered, jukeboxState, currentSong]);

  return (
    <PlayingProgressContext.Provider value={progress}>
      {children}
    </PlayingProgressContext.Provider>
  );
};

export const PlayingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const isPlaying = usePlayerIsPlaying();
  const activeMediaItem = usePlayerActiveItem();
  const api = useApi();
  const { getLocalPath } = useDownloadActions();
  const {
    sink, sinkPause, sinkResume, sinkSeek, sinkLoadQueue, sinkSkipTo, jukeboxState,
  } = usePlaybackSink();
  // The server's own clock, for the handful of places that read a position
  // without going through the progress context.
  const jukeboxPositionRef = useRef(0);
  jukeboxPositionRef.current = jukeboxState?.positionSeconds ?? 0;
  // Read through a ref inside callbacks so switching output doesn't rebuild
  // every transport handler in the tree.
  const sinkRef = useRef(sink);
  sinkRef.current = sink;
  /** The server is holding the audio; the local player must stay out of it. */
  const remoteOwnsPlayback = () => ownsPlayback(sinkRef.current);
  const streamQuality = useStreamQuality();
  const streamQualityRef = useRef(streamQuality);
  streamQualityRef.current = streamQuality;
  const preferredCodec = useSelector(selectPreferredCodec);
  const preferredCodecRef = useRef(preferredCodec);
  preferredCodecRef.current = preferredCodec;
  // The active server, read through a ref so the header-attachment helpers
  // below see the current one without rebuilding every transport handler.
  // Its Basic-auth credentials are the source of the ephemeral request headers
  // a protected Plex needs on both the stream and the artwork fetch.
  const activeServer = useSelector(selectActiveServer);
  const activeServerRef = useRef(activeServer);
  activeServerRef.current = activeServer;

  // Every Song->MediaItem crossing in this file goes through these two, so the
  // header-attachment happens in exactly one place regardless of which
  // consumer (foreground play, queue add, autoplay fill, play-next, restore)
  // built the queue. Unprotected servers get an item identical to before.
  const buildItem = useCallback(
    (song: Song): MediaItem =>
      buildTrackItem(song, mediaHeadersForSong(activeServerRef.current, song)),
    []
  );
  const toMediaItems = useCallback(
    (songs: Song[]): MediaItem[] => songs.map(buildItem),
    [buildItem]
  );
  const autoplayEnabled = useSelector(selectAutoplayEnabled);

  // Selected as primitives and rebuilt here rather than selected as objects.
  // `useSelector` compares by reference, so a selector that constructs its
  // result hands back a new value every render and re-runs the effects below
  // forever.
  const crossfadeSeconds = useSelector(selectCrossfadeSeconds);
  const crossfadeAlways = useSelector(selectCrossfadeAlways);
  const equalizerGains = useSelector(selectEqualizerGains);
  const crossfade = useMemo(
    () =>
      crossfadeSeconds > 0
        ? {
            durationSec: crossfadeSeconds,
            mode: crossfadeAlways ? ('always' as const) : ('gapless-aware' as const),
            skipIsImmediate: true,
          }
        : null,
    [crossfadeSeconds, crossfadeAlways],
  );
  const equalizerBands = useMemo(() => presetToBands(equalizerGains), [equalizerGains]);
  const isAudiomuseConfigured = useSelector(selectIsAudiomuseConfigured);
  const audiomuseConfig = useSelector(selectAudiomuseConfig);

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isBuffering, setIsBuffering] = useState(false);
  const [repeatMode, setRepeatMode] = useState<RepeatModeState>('off');
  const [shuffleMode, setShuffleMode] = useState<ShuffleMode>('off');
  const [playbackSpeed, setPlaybackSpeedState] = useState(1.0);
  // Read on every track change, which happens off the React render path, so
  // a ref rather than the state value — the same pattern the bookmark map uses.
  const playbackSpeedRef = useRef(1.0);
  const playbackSpeeds = useSelector(selectPlaybackSpeeds);
  const dispatch = useDispatch();
  const playbackSpeedsRef = useRef(playbackSpeeds);
  useEffect(() => { playbackSpeedsRef.current = playbackSpeeds; }, [playbackSpeeds]);
  const [volume, setVolumeState] = useState(1.0);
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
    opts: { listenedSeconds: number; startTime: number; playlistId?: string }
  ) => Promise<void>>(async () => {});
  const scrobbleOutgoingRef = useRef<(song: Song | null, listenedSeconds: number) => Promise<void>>(
    async () => {}
  );
  /** Position at the previous heartbeat, so a looping track's restart is visible. */
  const lastTickPositionRef = useRef(0);
  const submitNowPlayingRef = useRef<(song: Song) => void>(() => {});
  const removeFailedCurrentTrackRef = useRef<() => void>(() => {});
  const resolvePlayableSongRef = useRef<(song: Song) => Song>((s) => s);

  const { scrobbleIfNeeded, submitNowPlaying, reportPlaybackProgress, resetLastScrobbled } = useScrobbling();
  const bookmarks = useBookmarkManager();
  const bookmarksRef = useRef(bookmarks);
  useEffect(() => { bookmarksRef.current = bookmarks; }, [bookmarks]);

  const queueSync = useQueueSync();
  const queueSyncRef = useRef(queueSync);
  useEffect(() => { queueSyncRef.current = queueSync; }, [queueSync]);

  const persistence = usePlaybackPersistence();
  const persistenceRef = useRef(persistence);
  useEffect(() => { persistenceRef.current = persistence; }, [persistence]);

  // Auto-restore persisted playback on first mount for the active server.
  // This is what makes "the app remembers what I was doing" true on every
  // provider, not just Navidrome — the slice is our source of truth, and
  // the server-side queue mirror in useQueueSync is a secondary path used
  // only when local is empty (see ResumeQueueBanner).
  const persistedQueueIds = useSelector(selectPersistedPlaybackQueue);
  const persistedCurrentIndex = useSelector(selectPersistedPlaybackCurrentIndex);
  const persistedPositionMs = useSelector(selectPersistedPlaybackPositionMs);
  const persistedRepeatMode = useSelector(selectPersistedPlaybackRepeatMode);
  const persistedShuffleMode = useSelector(selectPersistedPlaybackShuffleMode);
  const persistedServerIdForPlayback = useSelector(selectPersistedPlaybackActiveServerId);
  const currentServerId = useSelector(selectActiveServerIdSel);
  const libraryTracks = useSelector(selectLibraryTracks);
  const hasAutoRestoredRef = useRef(false);
  useEffect(() => {
    if (hasAutoRestoredRef.current) return;

    // Why the restore did not happen, said out loud. Every one of these was a
    // bare `return`, so a queue that was displayed but never handed to the
    // player looked identical from the outside to one that had been restored
    // properly — the app showed the track and play did nothing, with nothing
    // anywhere to say which guard had stopped it. Some of these are ordinary
    // (the library has not hydrated yet, and the effect will run again), so
    // this is deliberately not a warning.
    const blocked =
      !currentServerId ? 'no active server'
      : persistedServerIdForPlayback !== currentServerId ? `queue belongs to another server (${persistedServerIdForPlayback})`
      : persistedQueueIds.length === 0 ? 'nothing persisted'
      : queueRef.current.length > 0 ? 'a queue is already loaded'
      : libraryTracks.length === 0 ? 'library not hydrated yet'
      : null;
    if (blocked) {
      console.log(`[player] not restoring the persisted queue: ${blocked}`);
      return;
    }

    const { queue: restored, index: idx } = buildRestoredQueue({
      persistedIds: persistedQueueIds,
      persistedIndex: persistedCurrentIndex,
      libraryTracks: libraryTracks as unknown as Song[],
      resolve: resolvePlayableSongRef.current,
    });
    if (restored.length === 0) {
      hasAutoRestoredRef.current = true;
      return;
    }
    hasAutoRestoredRef.current = true;

    // Restore modes before loading the queue — getBackend().setRepeatMode
    // inside loadQueue reads from repeatModeRef, which follows setState.
    setRepeatMode(persistedRepeatMode);
    setShuffleMode(persistedShuffleMode);
    queueRef.current = restored;
    queueSegmentsRef.current = [{
      startIndex: 0,
      length: restored.length,
      source: { kind: 'user', contextId: 'restored', contextType: 'adhoc' },
    }];
    currentIndexRef.current = idx;
    setCurrentIndex(idx);
    currentSongRef.current = restored[idx];
    setCurrentSong(restored[idx]);
    // Load paused at the persisted position — the user didn't ask us to
    // start playing on cold boot, they asked us to remember where they were.
    // Reported rather than dropped. This was `void`, so the failure that made
    // the restored queue unplayable was invisible from both sides — nothing in
    // a log, and a UI that looked correct.
    loadQueueRef.current(restored, idx, false, Math.floor(persistedPositionMs / 1000))
      .catch((error) => {
        console.warn('[player] restoring the persisted queue failed', error);
      });
  }, [
    currentServerId,
    persistedServerIdForPlayback,
    persistedQueueIds,
    persistedCurrentIndex,
    persistedPositionMs,
    persistedRepeatMode,
    persistedShuffleMode,
    libraryTracks,
  ]);
  const loadQueueRef = useRef<(songs: Song[], startIndex: number, play?: boolean, seek?: number) => Promise<void>>(async () => {});

  /**
   * Records the listen that is ending, attributed to the collection it came
   * from.
   *
   * Every caller scrobbles the *outgoing* song, and each does so before moving
   * the index, so the current index still points at the queue position that
   * song occupied — which is what carries the playlist tag.
   */
  const scrobbleOutgoing = useCallback((song: Song | null, listenedSeconds: number) => {
    const source = segmentAt(queueSegmentsRef.current, currentIndexRef.current)?.source;
    const playlistId = source?.kind === 'user' && source.contextType === 'playlist'
      ? source.contextId
      : undefined;
    return scrobbleIfNeededRef.current(song, {
      listenedSeconds,
      startTime: scrobbleStartTimeRef.current,
      playlistId,
    });
  }, []);
  // Stable for the life of the provider, so the effects and queue callbacks
  // below can reach it without listing it as a dependency.
  scrobbleOutgoingRef.current = scrobbleOutgoing;

  useEffect(() => { scrobbleIfNeededRef.current = scrobbleIfNeeded; }, [scrobbleIfNeeded]);
  useEffect(() => { submitNowPlayingRef.current = submitNowPlaying; }, [submitNowPlaying]);

  // Session heartbeat for mediaBrowser servers. Jellyfin will drop the session
  // (and never fire the Stopped event the Last.fm plugin scrobbles on) if it
  // stops seeing progress reports. 10s is well inside its ~30s idle window.
  //
  // The same tick also persists the current playback position so a kill or
  // background termination doesn't lose more than ~10s of resume precision.
  // The persistence hook throttles further; this loop is the writer.
  useEffect(() => {
    if (!isPlaying) {
      lastTickPositionRef.current = 0;
      return;
    }
    const interval = setInterval(() => {
      const song = currentSongRef.current;
      if (!song) return;
      const { position: positionSeconds, duration } = getBackend().getProgress();

      // A track on repeat never changes media item, so nothing else in here
      // ever sees it finish. Catching the restart is what makes the second
      // time round count as a second listen instead of being folded into the
      // first — a track left on repeat used to record exactly one play.
      const isLooping = repeatModeRef.current === 'one'
        || (repeatModeRef.current === 'all' && queueRef.current.length === 1);
      if (isRepeatLoop({
        isLooping,
        previousPosition: lastTickPositionRef.current,
        currentPosition: positionSeconds,
        duration,
      })) {
        // The pass that just ended is its own listen, so the guard against
        // scrobbling one track twice has to be released for it.
        resetLastScrobbled();
        void scrobbleOutgoingRef.current(song, Math.floor(lastTickPositionRef.current));
        scrobbleStartTimeRef.current = Date.now();
      }
      lastTickPositionRef.current = positionSeconds;

      reportPlaybackProgress(song, Math.floor(positionSeconds * 1000), false);
      persistenceRef.current.persistPosition(positionSeconds);
    }, 10_000);
    return () => clearInterval(interval);
  }, [isPlaying, reportPlaybackProgress, resetLastScrobbled]);
  useEffect(() => {
    repeatModeRef.current = repeatMode;
    persistenceRef.current.persistRepeatMode(repeatMode);
  }, [repeatMode]);
  useEffect(() => {
    shuffleModeRef.current = shuffleMode;
    persistenceRef.current.persistShuffleMode(shuffleMode);
  }, [shuffleMode]);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    // On pause, force-persist so kill-during-pause preserves the paused-at
    // position rather than losing up to the throttle window.
    if (!isPlaying && currentSongRef.current) {
      const positionSeconds = getBackend().getProgress().position;
      persistenceRef.current.persistPosition(positionSeconds, { force: true });
    }
  }, [isPlaying]);
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

  // Setup rebuilds the audio graph, so it is guarded and runs once per launch.
  //
  // `setCommands` is deliberately *outside* that guard. Re-asserting the
  // remote commands is the only way to reclaim the lock-screen controls from
  // anything else that has called `removeTarget(nil)` on the shared command
  // centre, and a guard around it is what left those controls greyed out while
  // @rntp/player was still in the app destroying them on its way out.
  useEffect(() => {
    if (!playerSetUp.current) {
      try {
        getBackend().setup();
        playerSetUp.current = true;
      } catch (err) {
        console.warn('player setup failed', err);
      }
    }

    getBackend().setCommands();
  }, []);

  /**
   * Push the audio settings down whenever they change.
   *
   * Separate from setup so that changing a slider takes effect immediately
   * rather than at the next launch — an equalizer you have to restart the app
   * to hear is one people conclude is broken.
   *
   * Both are safe to re-send: the engine bypasses a flat EQ and a null
   * crossfade outright, so the steady state costs nothing.
   */
  useEffect(() => {
    getBackend().setCrossfade(crossfade);
  }, [crossfade]);

  useEffect(() => {
    getBackend().setEqualizer(equalizerBands);
  }, [equalizerBands]);

  const bumpQueue = useCallback(() => setQueueVersion(v => v + 1), []);

  // Every queue mutation (playSong, playSongs, playSongInCollection, autoplay
  // fill, smart-shuffle inject, clear) calls bumpQueue immediately after. Rather
  // than sprinkle persistence calls at each site, mirror bumpQueue → persist here.
  useEffect(() => {
    if (queueVersion === 0) return; // Skip the initial state.
    persistenceRef.current.persistQueue({
      queue: queueRef.current,
      currentIndex: currentIndexRef.current,
      repeatMode: repeatModeRef.current,
      shuffleMode: shuffleModeRef.current,
    });
  }, [queueVersion]);

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
    getBackend().stop();
    getBackend().clear();
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

    getBackend().removeMediaItem(failedIndex);
    if (nextSong) {
      getBackend().skipToIndex(nextIndex);
      getBackend().play();
    }
  }, [bumpQueue, clearPlaybackState]);
  removeFailedCurrentTrackRef.current = removeFailedCurrentTrack;

  // Id of the track we've already attempted one URL-refresh retry for. Keyed by
  // song id rather than a time window — a wall-clock gate breaks when a failure
  // (e.g. an unreachable server) takes longer than the window to surface, which
  // makes every retry look like a "first" attempt and loops forever.
  const lastRecoveryAttemptedIdRef = useRef<string | null>(null);
  // Stalls resumed for the current song, so a connection that will never serve
  // it cannot loop. Reset when the song changes.
  const stallResumesRef = useRef<{ songId: string | null; count: number }>({ songId: null, count: 0 });

  useEffect(() => {
    const unsubscribe = getBackend().addListener(event => {
      if (event.type !== 'error') return;
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
      if (song?.contentKind === 'preview') {
        removeFailedCurrentTrackRef.current();
        return;
      }

      // Where playback had reached. A failure at 57 seconds into a track is a
      // stream that stalled, not a track that cannot be played, and the two
      // want opposite responses: resume in place, versus rebuild and drop.
      const positionSeconds = getBackend().getProgress().position;
      if (stallResumesRef.current.songId !== (song?.id ?? null)) {
        stallResumesRef.current = { songId: song?.id ?? null, count: 0 };
      }

      // First failure for this specific track: refresh every URL in the queue
      // (catches stale Navidrome tokens after JS context restarts) then retry.
      const decision = resolvePlaybackErrorAction(
        lastRecoveryAttemptedIdRef.current,
        song?.id,
        { positionSeconds, stallCount: stallResumesRef.current.count }
      );

      // A stall: put it back where it was rather than starting the track over.
      // Restarting is what made the same minute of a song play twice before
      // the track was removed as unplayable.
      if (decision.action === 'resume') {
        stallResumesRef.current = {
          songId: song?.id ?? null,
          count: decision.nextStallCount,
        };
        getBackend().seekTo(decision.positionSeconds);
        getBackend().play();
        return;
      }

      if (decision.action === 'retry') {
        lastRecoveryAttemptedIdRef.current = decision.nextLastRecoveryAttemptedId;
        const freshQueue = queueRef.current.map(s => resolvePlayableSongRef.current(s));
        queueRef.current = freshQueue;
        currentSongRef.current = freshQueue[currentIndexRef.current] ?? song;
        getBackend().setMediaItems(toMediaItems(freshQueue), currentIndexRef.current);
        getBackend().play();
        return;
      }

      // This track failed again after a retry — URL refresh didn't help, genuine failure.
      if (now - lastPlaybackErrorAtRef.current > 1500) {
        lastPlaybackErrorAtRef.current = now;
        toast.error(t('common.playbackError'));
      }

      removeFailedCurrentTrackRef.current();
    });

    return unsubscribe;
  }, [t, toMediaItems]);

  useEffect(() => {
    return getBackend().addListener(event => {
      if (event.type === 'stateChange') setIsBuffering(event.buffering);
    });
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
      const prevPosition = Math.floor(getBackend().getProgress().position);
      scrobbleOutgoingRef.current(prev, prevPosition);
      // Save a resume bookmark on the way out. isBookmarkable filters this
      // down to long-form tracks and podcasts — a 3-min song leaving mid-way
      // doesn't get one. Fire-and-forget: a save failing must not delay the
      // next track loading.
      void bookmarksRef.current.saveOrClear(prev, prevPosition);
      scrobbleStartTimeRef.current = Date.now();
    }

    const nativeQueue = getBackend().getQueue();
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

    const nativeIndex = getBackend().getActiveMediaItemIndex();
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

    // Persist the pointer move — the queue itself doesn't change every track,
    // only the current index does, so this is the frequent write.
    persistenceRef.current.persistCurrentIndex(newIndex);

    // Auto-resume for tracks that earn a bookmark (long-form + podcast).
    // Only seek when the player is still at the top of the track — a user
    // who already advanced past zero is where they want to be.
    const resumeSeconds = bookmarksRef.current.getResumePosition(songFromQueue.id);
    if (resumeSeconds && Math.floor(getBackend().getProgress().position) < 2) {
      getBackend().seekTo(resumeSeconds);
    }

    // Rate follows the kind of thing being played, not whatever was last set.
    // One global speed meant a podcast at 1.5x carried into the next song, and
    // reset to 1x on every launch — both wrong for the same reason, which is
    // that talking and music are not listened to at the same rate.
    const nextSpeed = speedFor(songFromQueue, playbackSpeedsRef.current);
    if (nextSpeed !== playbackSpeedRef.current) {
      playbackSpeedRef.current = nextSpeed;
      setPlaybackSpeedState(nextSpeed);
      getBackend().setPlaybackSpeed(nextSpeed);
    }

    submitNowPlayingRef.current(songFromQueue);

    // Server-side queue sync — hands the current queue and position to
    // Subsonic so opening yuzic on another device resumes here. Throttled
    // in the hook; a same-queue re-fire is a no-op.
    void queueSyncRef.current.save(
      queueRef.current,
      songFromQueue.id,
      Math.floor(getBackend().getProgress().position * 1000)
    );

    // Autoplay-fill from a radio station is meaningless: the station is its
    // own infinite feed and there's no seed to compute a follow-up from.
    // Podcasts skip fill too — a "next episode" isn't a similarity call.
    if (canFillQueueFrom(songFromQueue) && shouldFillQueue({
      queueLength: queueRef.current.length,
      currentIndex: newIndex,
      autoplayEnabled: autoplayEnabledRef.current,
      isFilling: isFillingRef.current,
    })) {
      void fillQueueIfLowRef.current();
    }
  }, [activeMediaItem, bumpQueue]);

  const resolvePlayableSong = useCallback((song: Song): Song => {
    // Preview URLs (Deezer etc.), live-stream URLs and resolved podcast
    // episode URLs are external — the server doesn't own them and rebuilding
    // through api.songs.buildStreamUrl would send the client to a broken
    // /rest/stream endpoint. Leave the song as-is.
    if (song.contentKind && song.contentKind !== 'song') return song;
    const localPath = getLocalPath(song.id);
    if (localPath) return { ...song, streamUrl: localPath };
    // "Original" serves the untouched file, which is the only way to hear a
    // lossless library losslessly — and the only setting that can hand the
    // device something it cannot decode at all. An Ogg Vorbis album played on
    // every quality except Original, where iOS has no Vorbis decoder and the
    // track failed outright. Transcoding it is a smaller loss than silence.
    const quality = playableQuality(song, streamQualityRef.current);
    // A provider can expose a playable resource under a different id from the
    // queue item (Plex direct-play parts are the concrete case). `streamId`
    // survives queue persistence precisely so the credentialled URL can be
    // rebuilt here without asking provider-specific code what an id means.
    const freshUrl = api.songs.buildStreamUrl(
      streamSourceId(song),
      quality,
      preferredCodecRef.current
    );
    return freshUrl ? { ...song, streamUrl: freshUrl } : song;
  }, [api, getLocalPath]);
  // Keep ref in sync during render so effects/handlers always have the latest version
  resolvePlayableSongRef.current = resolvePlayableSong;

  const loadQueue = useCallback(async (songs: Song[], startIndex: number, play = true, seekToPosition?: number) => {
    assertPlayableSongs(songs);
    resetLastScrobbled();
    scrobbleStartTimeRef.current = Date.now();
    if (remoteOwnsPlayback()) {
      // The server plays from its own playlist of ids; nothing is streamed to
      // this device, so the local player is never given the queue at all.
      await sinkLoadQueue(songs.map(song => song.id), startIndex, play);
      return;
    }
    getBackend().setMediaItems(toMediaItems(songs), startIndex);
    getBackend().setRepeatMode(
      repeatModeRef.current === 'all' ? 'queue' :
      repeatModeRef.current === 'one' ? 'track' :
      'off'
    );
    if (seekToPosition !== undefined && seekToPosition > 0) getBackend().seekTo(seekToPosition);
    if (play) getBackend().play();
  }, [resetLastScrobbled, sinkLoadQueue, toMediaItems]);
  // Assigned during render, not in an effect. React runs effects in the order
  // they are declared, and the auto-restore effect is declared far above this
  // one — so on first mount it called the placeholder this ref was
  // initialised with, an `async () => {}` that does nothing and resolves
  // successfully. The restore therefore "succeeded" silently: the queue and
  // current song were written to state, the one-shot guard was set, and the
  // player was never given anything. The app showed the remembered queue and
  // play did nothing, with no error anywhere to say why.
  //
  // `resolvePlayableSongRef` above is assigned the same way, for the same
  // reason.
  loadQueueRef.current = loadQueue;

  // Autoplay: fetches more tracks once the queue is running low, regardless
  // of shuffle mode. Independent of Smart Shuffle — see injectSmartShuffleTracks.
  const fillQueueIfLow = useCallback(async () => {
    if (isFillingRef.current) return;
    isFillingRef.current = true;
    try {
      const provider = resolveQueueFillProvider(providersRef.current);
      if (!provider) return;
      const extension = await provider.fetchExtension(
        buildFillRequest(queueRef.current, currentIndexRef.current)
      );
      const playable = playableSongsOnly(extension.map(resolvePlayableSongRef.current));
      if (!playable.length) return;
      const insertAt = queueRef.current.length;
      queueRef.current = [...queueRef.current, ...playable];
      queueSegmentsRef.current = tagSegment(queueSegmentsRef.current, insertAt, playable.length, {
        kind: 'autoplay-fill',
        contextId: `autoplay-${insertAt}`,
      });
      getBackend().addMediaItems(toMediaItems(playable));
      bumpQueue();
    } catch (err) {
      console.warn('Autoplay fill failed', err);
    } finally {
      isFillingRef.current = false;
    }
  }, [bumpQueue, toMediaItems]);
  useEffect(() => { fillQueueIfLowRef.current = fillQueueIfLow; }, [fillQueueIfLow]);

  // Smart Shuffle's one-shot injection: fetches related tracks and shuffles
  // them into the remainder of the queue (everything after the current
  // track), keeping the already-played prefix untouched.
  const injectSmartShuffleTracks = useCallback(async (wasPlaying: boolean, savedPosition: number) => {
    try {
      const provider = resolveQueueFillProvider(providersRef.current);
      if (!provider) return;
      const extension = await provider.fetchExtension(
        buildFillRequest(queueRef.current, currentIndexRef.current)
      );
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

  const playSongs = useCallback(async (
    input: (Song | SongBase)[],
    options: { startIndex?: number; shuffle?: boolean; contextId?: string } = {}
  ) => {
    // Library rows carry no stream URL — resolvePlayableSong derives one from
    // the id, so this needs no per-track network call.
    let songs = playableSongsOnly(
      (input as Song[]).map(resolvePlayableSongRef.current)
    );
    if (!songs.length) throw new Error('No playable tracks in selection');

    let index = clampStartIndex(songs.length, options.startIndex);

    if (options.shuffle) {
      // Shuffle the whole list before trimming, so the cap bounds the queue
      // without bounding what the shuffle can draw from.
      originalQueueRef.current = songs;
      songs = shuffleArray(songs);
      index = 0;
      setShuffleMode('shuffle');
    } else {
      originalQueueRef.current = null;
      setShuffleMode('off');
    }

    const trimmed = trimQueueAroundIndex(songs, index);
    songs = trimmed.songs;
    index = trimmed.index;

    const contextId = options.contextId ?? `adhoc-${Date.now()}`;
    queueRef.current = songs;
    queueSegmentsRef.current = [{
      startIndex: 0,
      length: songs.length,
      source: { kind: 'user', contextId, contextType: 'adhoc' },
    }];
    currentIndexRef.current = index;
    setCurrentIndex(index);
    currentSongRef.current = songs[index];
    setCurrentSong(songs[index]);
    bumpQueue();
    await loadQueue(songs, index);
  }, [bumpQueue, loadQueue]);

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
    getBackend().addMediaItems(toMediaItems(toAdd));
    bumpQueue();
  }, [bumpQueue, resolvePlayableSong, toMediaItems]);

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
    getBackend().addMediaItems(toMediaItems(toAdd));
    bumpQueue();
  }, [bumpQueue, resolvePlayableSong, toMediaItems]);

  const skipToNext = useCallback(async () => {
    await scrobbleOutgoingRef.current(
      currentSongRef.current,
      Math.floor(getBackend().getProgress().position)
    );
    const nextIdx = currentIndexRef.current + 1;
    if (nextIdx >= queueRef.current.length && repeatModeRef.current !== 'all') return;
    if (remoteOwnsPlayback()) {
      await sinkSkipTo(nextIdx % Math.max(1, queueRef.current.length));
      return;
    }
    getBackend().skipToNext();
    if (isPlayingRef.current) getBackend().play();
  }, [sinkSkipTo]);

  const skipToPrevious = useCallback(async () => {
    await scrobbleOutgoingRef.current(
      currentSongRef.current,
      Math.floor(getBackend().getProgress().position)
    );
    if (currentIndexRef.current <= 0) return;
    if (remoteOwnsPlayback()) {
      await sinkSkipTo(currentIndexRef.current - 1);
      return;
    }
    getBackend().skipToIndex(currentIndexRef.current - 1);
    if (isPlayingRef.current) getBackend().play();
  }, [sinkSkipTo]);

  const skipTo = useCallback(async (index: number) => {
    const song = queueRef.current[index];
    if (!song) return;
    if (index !== currentIndexRef.current) {
      await scrobbleOutgoingRef.current(
        currentSongRef.current,
        Math.floor(getBackend().getProgress().position)
      );
      scrobbleStartTimeRef.current = Date.now();
    }
    currentIndexRef.current = index;
    setCurrentIndex(index);
    currentSongRef.current = song;
    setCurrentSong(song);
    if (remoteOwnsPlayback()) {
      await sinkSkipTo(index);
      return;
    }
    getBackend().skipToIndex(index);
    if (isPlayingRef.current) getBackend().play();
  }, [sinkSkipTo]);

  // Each of these drives the local player *and* the sink, except where the
  // sink owns playback outright — then the local player is not running and
  // touching it would start a second copy of the track on this device.
  const pauseSong = useCallback(async () => {
    if (!remoteOwnsPlayback()) getBackend().pause();
    await sinkPause();
  }, [sinkPause]);

  const resumeSong = useCallback(async () => {
    if (!remoteOwnsPlayback()) getBackend().play();
    await sinkResume();
  }, [sinkResume]);

  const seekSong = useCallback((positionSeconds: number) => {
    if (!remoteOwnsPlayback()) getBackend().seekTo(positionSeconds);
    void sinkSeek(positionSeconds);
  }, [sinkSeek]);

  const jumpBy = useCallback((deltaSeconds: number) => {
    const { position, duration } = remoteOwnsPlayback()
      ? { position: jukeboxPositionRef.current, duration: Number(currentSongRef.current?.duration) || 0 }
      : getBackend().getProgress();
    const max = duration > 0 ? duration : Number.POSITIVE_INFINITY;
    const target = Math.max(0, Math.min(max, (position || 0) + deltaSeconds));
    if (!remoteOwnsPlayback()) getBackend().seekTo(target);
    void sinkSeek(target);
  }, [sinkSeek]);

  const getQueue = useCallback(() => [...queueRef.current], []);

  const moveTrack = useCallback((from: number, to: number) => {
    if (from === to) return;
    const q = [...queueRef.current];
    const [item] = q.splice(from, 1);
    q.splice(to, 0, item);
    queueRef.current = q;
    getBackend().moveMediaItem(from, to);
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
    getBackend().addMediaItems([buildItem(playableSong)]);
    bumpQueue();
  }, [bumpQueue, resolvePlayableSong, buildItem]);

  const playNext = useCallback((song: Song) => {
    if (!currentSongRef.current) return;
    const playableSong = resolvePlayableSong(song);
    assertPlayableSongs([playableSong]);
    const update = moveSongAfterCurrent(queueRef.current, currentIndexRef.current, playableSong);
    if (!update) return;
    if (update.removedIndex !== null) {
      getBackend().moveMediaItem(update.removedIndex, update.insertIndex);
    } else {
      getBackend().insertMediaItem(update.insertIndex, buildItem(playableSong));
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
  }, [bumpQueue, resolvePlayableSong, buildItem]);

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
    const savedPosition = getBackend().getProgress().position;
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
      getBackend().setRepeatMode(
        next === 'all' ? 'queue' :
        next === 'one' ? 'track' :
        'off'
      );
      return next;
    });
  }, []);

  const setVolume = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(1, next));
    setVolumeState(clamped);
    getBackend().setVolume(clamped);
  }, []);

  const setPlaybackSpeed = useCallback((speed: number) => {
    const clamped = clampSpeed(speed);
    playbackSpeedRef.current = clamped;
    setPlaybackSpeedState(clamped);
    getBackend().setPlaybackSpeed(clamped);
    // Remembered against the kind of thing playing, so choosing 1.5x for a
    // podcast does not follow the user into the next song — and survives a
    // relaunch, which a listener halfway through a series expects.
    dispatch(setPlaybackSpeedForProfile({
      profile: speedProfileFor(currentSongRef.current),
      speed: clamped,
    }));
  }, [dispatch]);

  const resetQueue = useCallback(async () => {
    await scrobbleOutgoingRef.current(
      currentSongRef.current,
      Math.floor(getBackend().getProgress().position)
    );
    resetLastScrobbled();
    scrobbleStartTimeRef.current = 0;
    getBackend().pause();
    getBackend().clear();
    queueRef.current = [];
    queueSegmentsRef.current = [];
    originalQueueRef.current = null;
    currentIndexRef.current = 0;
    setCurrentIndex(0);
    currentSongRef.current = null;
    setCurrentSong(null);
    setShuffleMode('off');
    setRepeatMode('off');
    getBackend().setRepeatMode('off');
    bumpQueue();
  }, [bumpQueue, resetLastScrobbled]);

  const stateValue = useMemo<PlayingStateType>(() => ({
    currentSong,
    isPlaying,
    isBuffering,
    currentIndex,
    repeatOn: repeatMode !== 'off',
    repeatMode,
    shuffleMode,
    playbackSpeed,
    volume,
    setCurrentSong,
  }), [currentSong, isPlaying, isBuffering, currentIndex, repeatMode, shuffleMode, playbackSpeed, volume]);

  // All callbacks are stable (deps are empty or other stable values via refs),
  // so actionsValue almost never changes after mount — action-only consumers
  // are immune to track/play/index changes.
  const actionsValue = useMemo<PlayingActionsType>(() => ({
    pauseSong,
    resumeSong,
    seekSong,
    jumpBy,
    playSong,
    playSongInCollection,
    playSongs,
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
    setVolume,
    moveTrack,
    addToQueue,
    playNext,
    playSimilar,
  }), [
    pauseSong,
    resumeSong,
    seekSong,
    jumpBy,
    playSong,
    playSongInCollection,
    playSongs,
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
    setVolume,
    moveTrack,
    addToQueue,
    playNext,
    playSimilar,
  ]);

  return (
    <PlayingActionsContext.Provider value={actionsValue}>
      <PlayingStateContext.Provider value={stateValue}>
        <PlayingQueueVersionContext.Provider value={queueVersion}>
          <PlayingProgressProvider>
            {children}
          </PlayingProgressProvider>
        </PlayingQueueVersionContext.Provider>
      </PlayingStateContext.Provider>
    </PlayingActionsContext.Provider>
  );
};
