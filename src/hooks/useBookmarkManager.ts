import { useCallback, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';

import { useApi } from '@/api';
import type { Song } from '@/types';
import { QueryKeys } from '@/enums/queryKeys';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';
import { isPodcastEpisode } from '@/utils/playback/contentKind';

/**
 * A track earns a resume bookmark if it's long-form: an audiobook, a
 * multi-hour DJ set, a podcast episode. Anything under this length can be
 * safely restarted from the top when you come back to it — auto-seeking to
 * 2:30 in a 3:15 pop song feels broken, not helpful.
 */
const BOOKMARK_MIN_DURATION_SECONDS = 20 * 60;

/** Below this fraction of the track we don't bother saving — the user hardly
 * started it, and restarting from zero is fine. */
const BOOKMARK_MIN_PROGRESS = 0.02;

/** Above this fraction we treat the track as finished and clear any existing
 * bookmark rather than saving one right before the end. */
const BOOKMARK_MAX_PROGRESS = 0.97;

function isBookmarkable(song: Song | null | undefined): boolean {
  if (!song) return false;
  if (isPodcastEpisode(song)) return true;
  const duration = Number(song.duration) || 0;
  return duration >= BOOKMARK_MIN_DURATION_SECONDS;
}

/**
 * Reads / writes bookmarks against whichever server is active. The list is
 * fetched once on connect and cached; lookups are O(1) against that map, so
 * asking "does this track have a resume point" per song load is cheap.
 *
 * Only tracks that pass isBookmarkable ever save — a 3-minute pop song
 * doesn't get a bookmark for pausing halfway through.
 */
export function useBookmarkManager() {
  const api = useApi();
  const serverId = useSelector(selectActiveServerId);
  const queryClient = useQueryClient();

  const supported = Boolean(api.bookmarks);

  const bookmarksQuery = useQuery({
    queryKey: [QueryKeys.Bookmarks, serverId ?? ''],
    queryFn: async () => (await api.bookmarks!.list()) ?? [],
    enabled: supported && Boolean(serverId),
    staleTime: 1000 * 60 * 30,
  });

  const bookmarksMapRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    const next = new Map<string, number>();
    for (const b of bookmarksQuery.data ?? []) next.set(b.songId, b.positionMs);
    bookmarksMapRef.current = next;
  }, [bookmarksQuery.data]);

  /** Returns the resume position in seconds, or null if none / not supported. */
  const getResumePosition = useCallback((songId: string): number | null => {
    const ms = bookmarksMapRef.current.get(songId);
    return typeof ms === 'number' && ms > 0 ? Math.floor(ms / 1000) : null;
  }, []);

  const saveOrClear = useCallback(async (song: Song | null | undefined, positionSeconds: number) => {
    if (!supported || !api.bookmarks || !song) return;
    if (!isBookmarkable(song)) return;

    const duration = Number(song.duration) || 0;
    const progress = duration > 0 ? positionSeconds / duration : 0;

    try {
      if (progress <= BOOKMARK_MIN_PROGRESS || progress >= BOOKMARK_MAX_PROGRESS) {
        // Too early → not worth saving. Too late → treat as finished and
        // clear any prior bookmark so the next listen starts from the top.
        if (bookmarksMapRef.current.has(song.id)) {
          await api.bookmarks.remove(song.id);
          bookmarksMapRef.current.delete(song.id);
        }
      } else {
        await api.bookmarks.create({
          songId: song.id,
          positionMs: Math.floor(positionSeconds * 1000),
        });
        bookmarksMapRef.current.set(song.id, Math.floor(positionSeconds * 1000));
      }
      // Invalidate lazily — the local map is already up to date, and the
      // periodic refetch will reconcile with any other client's changes.
      void queryClient.invalidateQueries({
        queryKey: [QueryKeys.Bookmarks, serverId ?? ''],
        refetchType: 'none',
      });
    } catch {
      // Bookmark writes are best-effort; a save failing doesn't break playback.
    }
  }, [api.bookmarks, queryClient, serverId, supported]);

  return { supported, getResumePosition, saveOrClear };
}
