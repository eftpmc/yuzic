import React, {
  createContext,
  useContext,
  useState,
  type ReactNode,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import {
  TrackPlayer,
  PlayerQueue,
  useActualQueue,
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
import * as listenbrainz from '@/api/listenbrainz';
import type { RootState } from '@/utils/redux/store';
import { toast } from '@backpackapp-io/react-native-toast';
import { useTranslation } from 'react-i18next';
import { areTrackIdsFullyDownloaded } from '@/utils/downloads/collectionState';

const SIMILAR_FETCH_TIMEOUT_MS = 2500;
const SIMILAR_MAX_SONGS = 80;
const LOOKAHEAD_COUNT = 5;

export interface PlaybackProgress {
  position: number;
  duration: number;
  buffered: number;
}

export interface PlayingContextType {
  currentSong: Song | null;
  isPlaying: boolean;
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

  selectQueueItem(index: number): Promise<void>;
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
}

const PlayingContext = createContext<PlayingContextType | undefined>(undefined);

export const usePlaying = () => {
  const ctx = useContext(PlayingContext);
  if (!ctx) throw new Error('usePlaying must be used within PlayingProvider');
  return ctx;
};

function passesScrobbleThreshold(
  listenedSeconds: number,
  durationSeconds: number
): boolean {
  const duration = Number(durationSeconds) || 0;
  const threshold =
    duration > 0 ? Math.min(Math.floor(duration * 0.5), 4 * 60) : 4 * 60;
  return listenedSeconds >= threshold;
}

export const PlayingProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { t } = useTranslation();
  const api = useApi();
  const dispatch = useDispatch();

  const { state: playbackState } = useOnPlaybackStateChange();
  const { position: rawPosition, totalDuration: rawDuration } =
    useOnPlaybackProgressChange();
  const { track: changedTrack } = useOnChangeTrack();
  const nowPlaying = useNowPlaying();
  const { queue: actualQueue } = useActualQueue();
  const { isTrackDownloaded } = useDownloadedTracks();

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

  const [repeatOn, setRepeatOn] = useState(false);
  const [shuffleOn, setShuffleOn] = useState(false);

  const playlistIdRef = useRef<string | null>(null);
  const songByIdRef = useRef<Map<string, Song>>(new Map());
  const originalQueueRef = useRef<Song[] | null>(null);

  const scrobbleSongRef = useRef<Song | null>(null);
  const scrobbleStartRef = useRef<number>(0);
  const lastScrobbledIdRef = useRef<string | null>(null);

  const loadingPlaylistRef = useRef(false);

  const progress: PlaybackProgress = useMemo(
    () => ({
      position:
        typeof rawPosition === 'number' && !Number.isNaN(rawPosition)
          ? rawPosition
          : 0,
      duration:
        typeof rawDuration === 'number' && !Number.isNaN(rawDuration)
          ? rawDuration
          : 0,
      buffered: 0,
    }),
    [rawPosition, rawDuration]
  );

  const isPlaying = playbackState === 'playing';
  const isBuffering =
    typeof playbackState === 'string' &&
    playbackState.includes('buffer');

  const primeSongs = useCallback((songs: Song[]) => {
    for (const song of songs) {
      songByIdRef.current.set(song.id, song);
    }
  }, []);

  const songToLazyTrackItem = useCallback(
    (song: Song): TrackItem => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      album: '',
      duration: parseFloat(song.duration || '0'),
      url: '',
      artwork: buildCover(song.cover, 'grid') || null,
      extraPayload: {
        artistId: song.artistId,
        albumId: song.albumId,
        serverId: song.sourceServerId ?? activeServer?.id ?? '',
        serverType: song.sourceServerType ?? activeServer?.type ?? '',
      },
    }),
    [activeServer?.id, activeServer?.type]
  );

  const songToResolvedTrackItem = useCallback(
    (song: Song): TrackItem => ({
      ...songToLazyTrackItem(song),
      url: song.streamUrl,
    }),
    [songToLazyTrackItem]
  );

  const trackToSong = useCallback((track?: TrackItem | null): Song | null => {
    if (!track) return null;

    const known = songByIdRef.current.get(track.id);
    if (known) return known;
    if (!track.url) return null;

    return {
      id: track.id,
      title: track.title ?? '',
      artist: track.artist ?? '',
      artistId: String(track.extraPayload?.artistId ?? ''),
      albumId: String(track.extraPayload?.albumId ?? ''),
      duration: String(track.duration ?? 0),
      streamUrl: track.url ?? '',
      cover: track.artwork
        ? { kind: 'url', url: track.artwork }
        : { kind: 'none' },
      sourceServerId: String(track.extraPayload?.serverId ?? '') || undefined,
      sourceServerType:
        track.extraPayload?.serverType === 'navidrome' ||
          track.extraPayload?.serverType === 'jellyfin'
          ? track.extraPayload.serverType
          : undefined,
    };
  }, []);

  const queueSongs = useMemo(
    () =>
      actualQueue
        .map(trackToSong)
        .filter((song): song is Song => song != null),
    [actualQueue, trackToSong]
  );

  const getQueue = useCallback((): Song[] => queueSongs, [queueSongs]);

  const currentSong = useMemo(() => {
    const track = changedTrack ?? nowPlaying.currentTrack;
    if (!track) return null;

    return songByIdRef.current.get(track.id) ?? trackToSong(track);
  }, [changedTrack, nowPlaying.currentTrack, trackToSong]);

  useEffect(() => {
    TrackPlayer.configure({
      androidAutoEnabled: true,
      carPlayEnabled: true,
      showInNotification: true,
      lookaheadCount: LOOKAHEAD_COUNT,
    });

    const subscription = TrackPlayer.onTracksNeedUpdate?.(
      async (tracks: TrackItem[], lookahead?: number) => {
        const neededCount =
          typeof lookahead === 'number' && lookahead > 0
            ? Math.min(lookahead, tracks.length)
            : tracks.length;

        const updates: TrackItem[] = [];

        for (const track of tracks.slice(0, neededCount)) {
          const song = songByIdRef.current.get(track.id);
          if (!song?.streamUrl) continue;

          updates.push({
            ...track,
            url: song.streamUrl,
          });
        }

        if (!updates.length) return;

        try {
          await TrackPlayer.updateTracks(updates);
        } catch (error) {
          console.warn('Failed to update lazy tracks', error);
        }
      }
    );

    return () => subscription?.();
  }, []);

  useEffect(() => {
    if (!currentSong) return;

    const previousSong = scrobbleSongRef.current;

    if (previousSong && previousSong.id !== currentSong.id) {
      const listenedSeconds = Math.floor(progress.position || 0);

      if (
        lastScrobbledIdRef.current !== previousSong.id &&
        passesScrobbleThreshold(
          listenedSeconds,
          Number(previousSong.duration) || 0
        )
      ) {
        lastScrobbledIdRef.current = previousSong.id;

        if (activeServer?.id) {
          dispatch(
            incrementPlay({
              serverId: activeServer.id,
              songId: previousSong.id,
              albumId: previousSong.albumId,
              artistId: previousSong.artistId,
            })
          );
        }

        if (listenBrainzConfig?.token) {
          const listenedAt = Math.floor(scrobbleStartRef.current / 1000);

          listenbrainz
            .submitScrobble(listenBrainzConfig, {
              artist: previousSong.artist,
              track: previousSong.title,
              listenedAt,
              durationSeconds:
                Number(previousSong.duration) > 0
                  ? Number(previousSong.duration)
                  : undefined,
              durationPlayedSeconds: listenedSeconds,
            })
            .catch(err => {
              console.warn('ListenBrainz scrobble failed', err);
            });
        }
      }
    }

    if (!scrobbleSongRef.current || scrobbleSongRef.current.id !== currentSong.id) {
      scrobbleSongRef.current = currentSong;
      scrobbleStartRef.current = Date.now();
    }
  }, [currentSong, progress.position, activeServer?.id, dispatch, listenBrainzConfig]);

  const isCollectionFullyDownloaded = useCallback(
    (collection: Album | Playlist): boolean => {
      const trackIds = collection.songs.map(song => String(song.id)).filter(Boolean);
      const downloadedIds = new Set(
        trackIds.filter(trackId => isTrackDownloaded(trackId))
      );
      return areTrackIdsFullyDownloaded(trackIds, downloadedIds);
    },
    [isTrackDownloaded]
  );

  const deleteCurrentPlaylist = useCallback(() => {
    const playlistId = playlistIdRef.current;
    if (!playlistId) return;

    try {
      PlayerQueue.deletePlaylist(playlistId);
    } catch {
      // ignore
    }

    playlistIdRef.current = null;
  }, []);

  const createAndLoadPlaylist = useCallback(
    async (songs: Song[], startIndex: number) => {
      if (loadingPlaylistRef.current) return;
      loadingPlaylistRef.current = true;

      try {
        if (!songs.length || !songs[startIndex]) return;

        deleteCurrentPlaylist();
        songByIdRef.current.clear();
        primeSongs(songs);

        const playlistId = PlayerQueue.createPlaylist('Now Playing', '', '');
        playlistIdRef.current = playlistId;

        const tracks = songs.map((song, i) =>
          i < LOOKAHEAD_COUNT
            ? songToResolvedTrackItem(song)
            : songToLazyTrackItem(song)
        );

        PlayerQueue.addTracksToPlaylist(playlistId, tracks);
        PlayerQueue.loadPlaylist(playlistId);

        await TrackPlayer.playSong(songs[startIndex].id, playlistId);
        await TrackPlayer.play();
      } finally {
        loadingPlaylistRef.current = false;
      }
    },
    [deleteCurrentPlaylist, primeSongs, songToLazyTrackItem, songToResolvedTrackItem]
  );

  const ensureTrackAllowed = useCallback(
    (song: Song): boolean => {
      if (!offlineModeEnabled) return true;
      if (isTrackDownloaded(song.id)) return true;
      toast.error(t('common.offline.downloadRequired'));
      return false;
    },
    [isTrackDownloaded, offlineModeEnabled, t]
  );

  const ensureCollectionAllowed = useCallback(
    (collection: Album | Playlist): boolean => {
      if (!offlineModeEnabled) return true;
      if (isCollectionFullyDownloaded(collection)) return true;
      toast.error(t('common.offline.noDownloadedTracks'));
      return false;
    },
    [isCollectionFullyDownloaded, offlineModeEnabled, t]
  );

  const playSong = useCallback(
    async (song: Song) => {
      if (!ensureTrackAllowed(song)) return;

      originalQueueRef.current = null;
      lastScrobbledIdRef.current = null;
      setShuffleOn(false);

      await createAndLoadPlaylist([song], 0);
    },
    [createAndLoadPlaylist, ensureTrackAllowed]
  );

  const playSongInCollection = useCallback(
    async (
      selectedSong: Song,
      collection: Album | Playlist,
      shuffle = false,
      selectedIndex?: number
    ) => {
      if (!ensureCollectionAllowed(collection)) return;

      let songs = [...collection.songs];
      let index = songs.findIndex(song => song.id === selectedSong.id);

      if (index < 0 && typeof selectedIndex === 'number') {
        index = selectedIndex;
      }

      if (index < 0 || index >= songs.length) {
        toast.error(t('common.error.unexpected'));
        return;
      }

      if (shuffle) {
        const picked = songs[index];
        const rest = songs.filter(song => song.id !== picked.id);
        songs = [picked, ...shuffleArray(rest)];
        index = 0;
        originalQueueRef.current = [...collection.songs];
        setShuffleOn(true);
      } else {
        originalQueueRef.current = null;
        setShuffleOn(false);
      }

      lastScrobbledIdRef.current = null;
      await createAndLoadPlaylist(songs, index);
    },
    [createAndLoadPlaylist, ensureCollectionAllowed, t]
  );

  const addCollectionToQueue = useCallback(
    async (collection: Album | Playlist) => {
      if (!ensureCollectionAllowed(collection)) return;

      const songs = collection.songs;
      if (!songs.length) return;

      const playlistId = playlistIdRef.current;
      if (!playlistId) {
        await playSongInCollection(songs[0], collection, false, 0);
        return;
      }

      const existingIds = new Set(queueSongs.map(song => song.id));
      const toAdd = songs.filter(song => !existingIds.has(song.id));
      if (!toAdd.length) return;

      primeSongs(toAdd);
      PlayerQueue.addTracksToPlaylist(
        playlistId,
        toAdd.map(song => songToLazyTrackItem(song))
      );
    },
    [
      ensureCollectionAllowed,
      playSongInCollection,
      primeSongs,
      queueSongs,
      songToLazyTrackItem,
    ]
  );

  const shuffleCollectionToQueue = useCallback(
    async (collection: Album | Playlist) => {
      if (!ensureCollectionAllowed(collection)) return;

      const songs = collection.songs;
      if (!songs.length) return;

      const playlistId = playlistIdRef.current;
      if (!playlistId) {
        await playSongInCollection(songs[0], collection, true, 0);
        return;
      }

      const existingIds = new Set(queueSongs.map(song => song.id));
      const toAdd = shuffleArray(songs.filter(song => !existingIds.has(song.id)));
      if (!toAdd.length) return;

      primeSongs(toAdd);
      PlayerQueue.addTracksToPlaylist(
        playlistId,
        toAdd.map(song => songToLazyTrackItem(song))
      );
    },
    [
      ensureCollectionAllowed,
      playSongInCollection,
      primeSongs,
      queueSongs,
      songToLazyTrackItem,
    ]
  );

  const selectQueueItem = useCallback(
    async (index: number) => {
      const song = queueSongs[index];
      if (!song) return;

      const playlistId = playlistIdRef.current;
      if (!playlistId) return;

      try {
        await TrackPlayer.updateTracks([songToResolvedTrackItem(song)]);
      } catch {
        // ignore
      }

      await TrackPlayer.playSong(song.id, playlistId);
      await TrackPlayer.play();
    },
    [queueSongs, songToResolvedTrackItem]
  );

  const skipToNext = useCallback(async () => {
    TrackPlayer.skipToNext();
  }, []);

  const skipToPrevious = useCallback(async () => {
    TrackPlayer.skipToPrevious();
  }, []);

  const pauseSong = useCallback(async () => {
    TrackPlayer.pause();
  }, []);

  const resumeSong = useCallback(async () => {
    TrackPlayer.play();
  }, []);

  const moveTrack = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return;

      const playlistId = playlistIdRef.current;
      if (!playlistId) return;

      const item = queueSongs[fromIndex];
      if (!item || !queueSongs[toIndex]) return;

      PlayerQueue.reorderTrackInPlaylist(playlistId, item.id, toIndex);
    },
    [queueSongs]
  );

  const addToQueue = useCallback(
    async (song: Song) => {
      if (!ensureTrackAllowed(song)) return;

      const playlistId = playlistIdRef.current;
      if (!playlistId) {
        await playSong(song);
        return;
      }

      if (queueSongs.some(item => item.id === song.id)) return;

      primeSongs([song]);
      PlayerQueue.addTrackToPlaylist(playlistId, songToLazyTrackItem(song));
    },
    [ensureTrackAllowed, playSong, primeSongs, queueSongs, songToLazyTrackItem]
  );

  const playNext = useCallback(
    async (song: Song) => {
      if (!ensureTrackAllowed(song)) return;

      const playlistId = playlistIdRef.current;
      if (!playlistId) {
        await playSong(song);
        return;
      }

      const currentIndex =
        typeof nowPlaying?.currentIndex === 'number' && nowPlaying.currentIndex >= 0
          ? nowPlaying.currentIndex
          : queueSongs.findIndex(item => item.id === currentSong?.id);

      if (currentIndex < 0) {
        await playSong(song);
        return;
      }

      const targetIndex = Math.min(currentIndex + 1, queueSongs.length);
      const alreadyInQueue = queueSongs.some(item => item.id === song.id);

      primeSongs([song]);

      if (!alreadyInQueue) {
        PlayerQueue.addTrackToPlaylist(playlistId, songToLazyTrackItem(song));
      }

      PlayerQueue.reorderTrackInPlaylist(playlistId, song.id, targetIndex);
    },
    [
      currentSong?.id,
      ensureTrackAllowed,
      nowPlaying?.currentIndex,
      playSong,
      primeSongs,
      queueSongs,
      songToLazyTrackItem,
    ]
  );

  const getSimilarWithTimeout = useCallback(
    async (songId: string): Promise<Song[] | null> => {
      const timeoutPromise = new Promise<null>(resolve => {
        setTimeout(() => resolve(null), SIMILAR_FETCH_TIMEOUT_MS);
      });

      return Promise.race([api.similar.getSimilarSongs(songId), timeoutPromise]);
    },
    [api.similar]
  );

  const playSimilar = useCallback(
    async (song: Song) => {
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

        const others = shuffleArray(similarSongs.filter(s => s.id !== song.id)).slice(
          0,
          Math.max(SIMILAR_MAX_SONGS - 1, 0)
        );

        const songs = [song, ...others];

        if (songs.length <= 1) {
          await playSong(song);
          return;
        }

        originalQueueRef.current = null;
        setShuffleOn(false);
        lastScrobbledIdRef.current = null;

        await createAndLoadPlaylist(songs, 0);
        toast.success(t('common.playingSimilar'));
      } catch {
        await playSong(song);
      }
    },
    [
      createAndLoadPlaylist,
      getSimilarWithTimeout,
      offlineModeEnabled,
      playSong,
      t,
    ]
  );

  const toggleShuffle = useCallback(async () => {
    const queue = queueSongs;
    if (!queue.length) return;

    if (!shuffleOn) {
      originalQueueRef.current = [...queue];

      const currentIndex =
        typeof nowPlaying?.currentIndex === 'number' && nowPlaying.currentIndex >= 0
          ? nowPlaying.currentIndex
          : queue.findIndex(song => song.id === currentSong?.id);

      const current = queue[Math.max(currentIndex, 0)] ?? queue[0];
      const rest = queue.filter(song => song.id !== current.id);
      const shuffled = [current, ...shuffleArray(rest)];

      setShuffleOn(true);
      await createAndLoadPlaylist(shuffled, 0);
      return;
    }

    if (!originalQueueRef.current) return;

    const originalQueue = originalQueueRef.current;
    const currentIndex = originalQueue.findIndex(song => song.id === currentSong?.id);

    setShuffleOn(false);
    await createAndLoadPlaylist(originalQueue, Math.max(currentIndex, 0));
    originalQueueRef.current = null;
  }, [
    createAndLoadPlaylist,
    currentSong?.id,
    nowPlaying?.currentIndex,
    queueSongs,
    shuffleOn,
  ]);

  const toggleRepeat = useCallback(() => {
    setRepeatOn(prev => {
      const next = !prev;
      TrackPlayer.setRepeatMode(next ? 'Playlist' : 'off');
      return next;
    });
  }, []);

  const resetQueue = useCallback(async () => {
    lastScrobbledIdRef.current = null;
    scrobbleSongRef.current = null;
    scrobbleStartRef.current = 0;

    TrackPlayer.pause();
    deleteCurrentPlaylist();

    originalQueueRef.current = null;
    songByIdRef.current.clear();
    setShuffleOn(false);
    setRepeatOn(false);
    TrackPlayer.setRepeatMode('off');
  }, [deleteCurrentPlaylist]);

  return (
    <PlayingContext.Provider
      value={{
        currentSong,
        isPlaying,
        isBuffering,
        progress,
        pauseSong,
        resumeSong,
        playSong,
        playSongInCollection,
        addCollectionToQueue,
        shuffleCollectionToQueue,
        selectQueueItem,
        skipToNext,
        skipToPrevious,
        getQueue,
        resetQueue,
        moveTrack,
        addToQueue,
        playNext,
        playSimilar,
        toggleShuffle,
        repeatOn,
        toggleRepeat,
        shuffleOn,
      }}
    >
      {children}
    </PlayingContext.Provider>
  );
};