import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Song } from '@/types';
import { incrementPlay } from '@/utils/redux/slices/statsSlice';
import {
  buildScrobbleMutation,
  type ScrobbleDestination,
} from '@/utils/offline/offlineMutations';
import { enqueueOfflineMutationAction } from '@/utils/redux/slices/offlineMutationsSlice';
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
import {
  selectServerScrobbleEnabled,
  selectServerNowPlayingEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import { useApi } from '@/api';

function passesScrobbleThreshold(listenedSeconds: number, durationSeconds: number): boolean {
  const duration = Number(durationSeconds) || 0;
  const threshold = duration > 0 ? Math.min(Math.floor(duration * 0.5), 4 * 60) : 4 * 60;
  return listenedSeconds >= threshold;
}

export function useScrobbling() {
  const api = useApi();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const listenBrainzConfig = useSelector(selectListenBrainzConfig);
  const lbScrobbleEnabled = useSelector(selectListenBrainzScrobbleEnabled);
  const lbNowPlayingEnabled = useSelector(selectListenBrainzNowPlayingEnabled);
  const lastFmConfig = useSelector(selectLastFmConfig);
  const lastFmScrobbleEnabled = useSelector(selectLastFmScrobbleEnabled);
  const lastFmNowPlayingEnabled = useSelector(selectLastFmNowPlayingEnabled);
  const serverScrobbleEnabled = useSelector(selectServerScrobbleEnabled);
  const serverNowPlayingEnabled = useSelector(selectServerNowPlayingEnabled);

  const lastScrobbledIdRef = useRef<string | null>(null);

  const resetLastScrobbled = useCallback(() => {
    lastScrobbledIdRef.current = null;
  }, []);

  /**
   * Parks a failed scrobble in the offline queue instead of dropping it. Each
   * destination is queued on its own, so a Last.fm outage never re-submits to
   * ListenBrainz, which already accepted the play.
   */
  const queueScrobble = useCallback((
    destination: ScrobbleDestination,
    song: Song,
    startTime: number,
    durationSeconds: number,
    listenedSeconds: number
  ) => {
    if (!activeServer?.id) return;
    dispatch(enqueueOfflineMutationAction(buildScrobbleMutation({
      serverId: activeServer.id,
      destination,
      songId: song.id,
      artist: song.artist,
      track: song.title,
      album: song.albumTitle,
      startedAt: startTime,
      durationSeconds,
      listenedSeconds,
    })));
  }, [activeServer, dispatch]);

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
      if (serverScrobbleEnabled) {
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
          } catch {
            queueScrobble('server', song, opts.startTime, songDuration, opts.listenedSeconds);
          }
        }
      }
    } else if (serverScrobbleEnabled) {
      try {
        await api.songs.scrobble(song.id, opts.startTime);
      } catch {
        queueScrobble('server', song, opts.startTime, songDuration, opts.listenedSeconds);
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
          album: song.albumTitle,
        });
      } catch {
        queueScrobble('listenbrainz', song, opts.startTime, songDuration, opts.listenedSeconds);
      }
    }

    if (lastFmConfig && lastFmScrobbleEnabled) {
      try {
        await lastfm.submitScrobble(lastFmConfig, {
          artist: song.artist,
          track: song.title,
          timestamp: Math.floor(opts.startTime / 1000),
          duration: songDuration > 0 ? songDuration : undefined,
          album: song.albumTitle,
        });
      } catch {
        queueScrobble('lastfm', song, opts.startTime, songDuration, opts.listenedSeconds);
      }
    }
  }, [activeServer, serverScrobbleEnabled, listenBrainzConfig, lbScrobbleEnabled, lastFmConfig, lastFmScrobbleEnabled, dispatch, api, queueScrobble]);

  const submitNowPlaying = useCallback((song: Song) => {
    const songDuration = Number(song.duration) || undefined;

    if (activeServer?.type === 'navidrome' && serverNowPlayingEnabled) {
      const password = activeServer.auth?.password as string | undefined;
      if (activeServer.serverUrl && activeServer.username && password) {
        navidromeScrobble.nowPlaying(
          {
            serverUrl: activeServer.serverUrl,
            username: activeServer.username,
            password,
            basicAuth: activeServer.basicAuth,
          },
          song.id
        ).catch(() => {});
      }
    }

    if (listenBrainzConfig?.token && lbNowPlayingEnabled) {
      listenbrainz.submitNowPlaying(listenBrainzConfig, {
        artist: song.artist,
        track: song.title,
        durationSeconds: songDuration,
        album: song.albumTitle,
      }).catch(() => {});
    }
    if (lastFmConfig && lastFmNowPlayingEnabled) {
      lastfm.updateNowPlaying(lastFmConfig, {
        artist: song.artist,
        track: song.title,
        duration: songDuration,
        album: song.albumTitle,
      }).catch(() => {});
    }
  }, [activeServer, serverNowPlayingEnabled, listenBrainzConfig, lbNowPlayingEnabled, lastFmConfig, lastFmNowPlayingEnabled]);

  return { scrobbleIfNeeded, submitNowPlaying, resetLastScrobbled };
}
