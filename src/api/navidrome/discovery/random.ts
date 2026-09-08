import type { NavidromeClient } from '../client';
import type { SubsonicResponse } from '../types';
import type { CoverSource, Song } from '@/types';

/** A random slice of the user's library. Optional genre/year filters route to
 * a themed shelf (a random draw of 80s tracks, jazz picks, etc.). */
export async function getRandomSongs(
  client: NavidromeClient,
  opts: { size?: number; genre?: string; fromYear?: number; toYear?: number } = {}
): Promise<Song[]> {
  try {
    const params: Record<string, string | number> = {};
    if (opts.size) params.size = opts.size;
    if (opts.genre) params.genre = opts.genre;
    if (opts.fromYear) params.fromYear = opts.fromYear;
    if (opts.toYear) params.toYear = opts.toYear;
    const raw = await client.request<SubsonicResponse>('getRandomSongs.view', params);
    const songs = raw?.['subsonic-response']?.randomSongs?.song ?? [];
    if (!Array.isArray(songs)) return [];
    return songs
      .filter((s): s is typeof s & { id: string } => !!s?.id)
      .map((s) => {
        const cover: CoverSource = s.coverArt
          ? { kind: 'navidrome', coverArtId: s.coverArt }
          : { kind: 'none' };
        return {
          id: s.id,
          title: s.title ?? 'Unknown',
          artist: s.artist ?? 'Unknown Artist',
          artistId: s.artistId ?? '',
          albumId: s.albumId ?? '',
          cover,
          duration: String(s.duration ?? 0),
          streamUrl: client.buildStreamUrl(s.id),
          dateReleased: s.year != null ? String(s.year) : undefined,
        };
      });
  } catch (error) {
    console.error('Navidrome getRandomSongs failed:', error);
    return [];
  }
}
