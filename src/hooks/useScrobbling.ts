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
import * as navidromeScrobble from '@/api/navidrome/scrobble';
import { canScrobble } from '@/utils/playback/contentKind';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import {
  selectListenBrainzConfig,
  selectListenBrainzScrobbleEnabled,
} from '@/utils/redux/selectors/listenbrainzSelectors';
import {
  selectServerScrobbleEnabled,
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
  // Now-playing is not its own toggle — it follows scrobble. See the note
  // on selectServerNowPlayingEnabled in settingsSelectors.
  const lbScrobbleEnabled = useSelector(selectListenBrainzScrobbleEnabled);
  const serverScrobbleEnabled = useSelector(selectServerScrobbleEnabled);

  const lastScrobbledIdRef = useRef<string | null>(null);

  const resetLastScrobbled = useCallback(() => {
    lastScrobbledIdRef.current = null;
  }, []);

  /**
   * Parks a failed scrobble in the offline queue instead of dropping it. Each
   * destination is queued on its own, so a ListenBrainz outage never
   * re-submits to the server, which already accepted the play. Last.fm is
   * not a destination yuzic owns — the media server (Navidrome/Jellyfin/Emby)
   * forwards scrobbles to Last.fm when a user has configured that on the
   * server side.
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
    // A live radio stream isn't a discrete listen — nothing to record. Podcast
    // episodes still scrobble; a finished episode is a listen the same way a
    // finished track is.
    if (!canScrobble(song)) return;
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
        // Jellyfin/Emby's Last.fm plugin scrobbles on PlaybackStopped; markPlayed
        // alone doesn't reach it. Send the session-stop event with the actual
        // listened position so the plugin picks it up.
        api.songs.reportPlaybackStop?.(song.id, opts.listenedSeconds * 1000).catch(() => {});
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
  }, [activeServer, serverScrobbleEnabled, listenBrainzConfig, lbScrobbleEnabled, dispatch, api, queueScrobble]);

  const submitNowPlaying = useCallback((song: Song) => {
    // Live streams don't have a "now playing this track" identity — the
    // server would either reject an empty-duration nowPlaying or record it
    // as an odd zero-length listen. Skip the whole path for them.
    if (!canScrobble(song)) return;
    const songDuration = Number(song.duration) || undefined;

    if (activeServer?.type === 'navidrome' && serverScrobbleEnabled) {
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

    // Session-start on Jellyfin/Emby. Fire-and-forget: the scrobble plugin
    // reads these events, but a session-report outage should never block the
    // player. Navidrome adapters don't implement this — the ?. skips them.
    if (activeServer?.type !== 'navidrome' && serverScrobbleEnabled) {
      api.songs.reportPlaybackStart?.(song.id, 0).catch(() => {});
    }

    if (listenBrainzConfig?.token && lbScrobbleEnabled) {
      listenbrainz.submitNowPlaying(listenBrainzConfig, {
        artist: song.artist,
        track: song.title,
        durationSeconds: songDuration,
        album: song.albumTitle,
      }).catch(() => {});
    }
  }, [activeServer, serverScrobbleEnabled, listenBrainzConfig, lbScrobbleEnabled, api]);

  /**
   * Keeps the Jellyfin/Emby session alive by pinging /Sessions/Playing/Progress
   * on a fixed cadence. Without this heartbeat the server can drop the session
   * before the track finishes, and PlaybackStopped never reaches the Last.fm
   * plugin. Fire-and-forget; a failed ping is not user-visible.
   */
  const reportPlaybackProgress = useCallback((song: Song, positionMs: number, isPaused: boolean) => {
    if (activeServer?.type === 'navidrome') return;
    if (!serverScrobbleEnabled) return;
    api.songs.reportPlaybackProgress?.(song.id, positionMs, isPaused).catch(() => {});
  }, [activeServer?.type, serverScrobbleEnabled, api]);

  return { scrobbleIfNeeded, submitNowPlaying, reportPlaybackProgress, resetLastScrobbled };
}

