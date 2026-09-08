import type { NavidromeClient } from '../client';
import type { SubsonicResponse } from '../types';
import type { ExternalArtistBase } from '@/types';

/**
 * Navidrome's Subsonic `getArtistInfo2.view` returns a Last.fm-derived
 * biography and a list of similar artists (with library ids where the artist
 * is present, or names only where not). We only keep artists the server
 * already has an id for — otherwise the caller has no way to navigate to
 * them, and a raw string is a footgun for the matched-navigation layer.
 */
export async function getSimilarArtists(
  client: NavidromeClient,
  artistId: string,
  count = 20
): Promise<ExternalArtistBase[]> {
  try {
    const raw = await client.request<SubsonicResponse>('getArtistInfo2.view', {
      id: artistId,
      count,
      includeNotPresent: 'false',
    });
    const similar = raw?.['subsonic-response']?.artistInfo2?.similarArtist ?? [];
    if (!Array.isArray(similar)) return [];

    return similar
      .filter((s): s is typeof s & { id: string; name: string } => !!s?.id && !!s?.name)
      .map((s) => ({
        id: s.id,
        name: s.name,
        cover: s.coverArt
          ? { kind: 'navidrome' as const, coverArtId: s.coverArt }
          : { kind: 'letter' as const, name: s.name },
        subtext: '',
      }));
  } catch (error) {
    console.error('Navidrome getSimilarArtists failed:', error);
    return [];
  }
}
