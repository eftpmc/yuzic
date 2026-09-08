import type { NavidromeClient } from '../client';
import type { SubsonicResponse } from '../types';
import type { CoverSource, Song } from '@/types';

/**
 * Server-ranked "top songs" for an artist. Subsonic's getTopSongs is backed by
 * Last.fm playcount data on the server side — the ranking is authoritative
 * and comes from the world's play history, not the user's own.
 *
 * Named by artist string, not id: Subsonic's endpoint takes the artist name.
 */
export async function getTopSongs(
  client: NavidromeClient,
  artistName: string,
  count = 20
): Promise<Song[]> {
  if (!artistName.trim()) return [];
  try {
    const raw = await client.request<SubsonicResponse>('getTopSongs.view', {
      artist: artistName,
      count,
    });
    const rows = raw?.['subsonic-response']?.topSongs?.song ?? [];
    if (!Array.isArray(rows)) return [];
    return rows
      .filter((s): s is typeof s & { id: string } => !!s?.id)
      .map((s) => {
        const cover: CoverSource = s.coverArt
          ? { kind: 'navidrome', coverArtId: s.coverArt }
          : { kind: 'none' };
        return {
          id: s.id,
          title: s.title ?? 'Unknown',
          artist: s.artist ?? artistName,
          artistId: s.artistId ?? '',
          albumId: s.albumId ?? '',
          cover,
          duration: String(s.duration ?? 0),
          streamUrl: client.buildStreamUrl(s.id),
          bitrate: s.bitRate ?? undefined,
          sampleRate: s.samplingRate ?? undefined,
          bitsPerSample: s.bitDepth ?? undefined,
          mimeType: s.contentType ?? undefined,
          dateReleased: s.year != null ? String(s.year) : undefined,
          disc: s.discNumber ?? undefined,
          trackNumber: s.track ?? undefined,
          dateAdded: s.created ?? undefined,
        };
      });
  } catch (error) {
    console.error('Navidrome getTopSongs failed:', error);
    return [];
  }
}
