import { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { useApi } from '@/api';
import type { Song } from '@/types';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import { selectResumeLongTracksEnabled } from '@/utils/redux/selectors/settingsSelectors';
import { selectPersistedPlaybackBookmarks } from '@/utils/redux/selectors/playbackSelectors';
import {
  seedPlaybackBookmarks,
  setPlaybackBookmark,
} from '@/utils/redux/slices/playbackSlice';
import { isPodcastEpisode } from '@/utils/playback/contentKind';

/**
 * Bookmarks in yuzic:
 *
 *   - Local (Redux, persisted): the source of truth. A per-track resume
 *     position that survives kill/relaunch on any provider, always.
 *   - Server (optional mirror): Navidrome exposes bookmarks natively;
 *     Jellyfin/Emby carry the same concept as `UserData.PlaybackPositionTicks`
 *     on any item. Where the server has one, we seed the local map on
 *     connect and push writes so cross-device resume works.
 *
 * When the "Resume long tracks" toggle is off, none of this runs — no fetch,
 * no seeding, no write, no seek.
 */

const BOOKMARK_MIN_DURATION_SECONDS = 20 * 60;
const BOOKMARK_MIN_PROGRESS = 0.02;
const BOOKMARK_MAX_PROGRESS = 0.97;

function isBookmarkable(song: Song | null | undefined): boolean {
  if (!song) return false;
  if (isPodcastEpisode(song)) return true;
  const duration = Number(song.duration) || 0;
  return duration >= BOOKMARK_MIN_DURATION_SECONDS;
}

export function useBookmarkManager() {
  const api = useApi();
  const dispatch = useDispatch();
  const serverId = useSelector(selectActiveServerId);
  const enabled = useSelector(selectResumeLongTracksEnabled);
  const bookmarksMap = useSelector(selectPersistedPlaybackBookmarks);

  // Fast, always-up-to-date snapshot for the read hot path (song load). The
  // subscribed selector alone would re-render every consumer on every write;
  // a ref updated inside an effect stays free.
  const bookmarksRef = useRef<Record<string, number>>({});
  useEffect(() => { bookmarksRef.current = bookmarksMap; }, [bookmarksMap]);

  const supportsServer = Boolean(api.bookmarks);

  // Seed the local map from the server once per connect. Server writes we
  // made while offline aren't reflected here yet — but seedPlaybackBookmarks
  // merges rather than replaces, so anything local stays.
  useEffect(() => {
    if (!enabled || !supportsServer || !serverId) return;
    let cancelled = false;
    (async () => {
      try {
        const rows = (await api.bookmarks!.list()) ?? [];
        if (cancelled || rows.length === 0) return;
        const seed: Record<string, number> = {};
        for (const b of rows) seed[b.songId] = b.positionMs;
        dispatch(seedPlaybackBookmarks(seed));
      } catch {
        // Seeding is best-effort — a failed connect leaves local as-is.
      }
    })();
    return () => { cancelled = true; };
  }, [api.bookmarks, dispatch, enabled, serverId, supportsServer]);

  const getResumePosition = useCallback((songId: string): number | null => {
    if (!enabled) return null;
    const ms = bookmarksRef.current[songId];
    return typeof ms === 'number' && ms > 0 ? Math.floor(ms / 1000) : null;
  }, [enabled]);

  const saveOrClear = useCallback(async (song: Song | null | undefined, positionSeconds: number) => {
    if (!enabled || !song) return;
    if (!isBookmarkable(song)) return;

    const duration = Number(song.duration) || 0;
    const progress = duration > 0 ? positionSeconds / duration : 0;

    // Too early → don't bother; too late → treat as finished and clear.
    if (progress <= BOOKMARK_MIN_PROGRESS || progress >= BOOKMARK_MAX_PROGRESS) {
      if (bookmarksRef.current[song.id]) {
        dispatch(setPlaybackBookmark({ songId: song.id, positionMs: null }));
        if (supportsServer) api.bookmarks!.remove(song.id).catch(() => {});
      }
      return;
    }

    const positionMs = Math.floor(positionSeconds * 1000);
    dispatch(setPlaybackBookmark({ songId: song.id, positionMs }));

    if (supportsServer) {
      api.bookmarks!.create({ songId: song.id, positionMs }).catch(() => {});
    }
  }, [api.bookmarks, dispatch, enabled, supportsServer]);

  return { supported: enabled, getResumePosition, saveOrClear };
}
