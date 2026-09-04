import type { NavidromeClient } from '../client';
import type { SubsonicResponse } from '../types';
import type { NowPlayingEntry } from '@/api/types';

/**
 * Users currently listening on this server. Small servers with a single user
 * mostly return this user; multi-user Navidromes return everyone active.
 */
export async function getNowPlaying(client: NavidromeClient): Promise<NowPlayingEntry[]> {
  try {
    const raw = await client.request<SubsonicResponse>('getNowPlaying.view', {});
    const entries = raw?.['subsonic-response']?.nowPlaying?.entry ?? [];
    if (!Array.isArray(entries)) return [];
    return entries
      .filter((e): e is typeof e & { id: string; username: string } => !!e?.id && !!e?.username)
      .map((e) => ({
        songId: e.id,
        title: e.title ?? 'Unknown',
        artist: e.artist ?? 'Unknown Artist',
        albumTitle: e.album ?? undefined,
        albumId: e.albumId ?? undefined,
        coverArt: e.coverArt ?? undefined,
        username: e.username,
        minutesAgo: typeof e.minutesAgo === 'number' ? e.minutesAgo : undefined,
      }));
  } catch (error) {
    console.error('Navidrome getNowPlaying failed:', error);
    return [];
  }
}
