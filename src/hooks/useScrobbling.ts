import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNetInfo } from '@react-native-community/netinfo';
import { Song } from '@/types';
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

  const netInfo = useNetInfo();
  const isOfflineRef = useRef(false);
  isOfflineRef.current = netInfo.isConnected === false || netInfo.isInternetReachable === false;

  const lastScrobbledIdRef = useRef<string | null>(null);

  const resetLastScrobbled = useCallback(() => {
    lastScrobbledIdRef.current = null;
  }, []);

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
          } catch (err) {
            console.warn('Navidrome scrobble failed', err);
          }
        }
      }
    } else if (serverScrobbleEnabled) {
      try {
        await api.songs.scrobble(song.id, opts.startTime);
      } catch {
        // best-effort
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
  }, [activeServer, serverScrobbleEnabled, listenBrainzConfig, lbScrobbleEnabled, lastFmConfig, lastFmScrobbleEnabled, dispatch, api]);

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
      }).catch(() => {});
    }
    if (lastFmConfig && lastFmNowPlayingEnabled) {
      lastfm.updateNowPlaying(lastFmConfig, {
        artist: song.artist,
        track: song.title,
        duration: songDuration,
      }).catch(() => {});
    }
  }, [activeServer, serverNowPlayingEnabled, listenBrainzConfig, lbNowPlayingEnabled, lastFmConfig, lastFmNowPlayingEnabled]);

  return { scrobbleIfNeeded, submitNowPlaying, resetLastScrobbled };
}
