import { getReleaseGroup } from '@/api/musicbrainz';

/**
 * Turns an MBID (release-group) into the canonical title + artist strings
 * MusicBrainz agreed on. Two reasons this matters for a slskd search:
 *
 *   - Filename matches on Soulseek are string-based. A Deezer title like
 *     "In Rainbows (Special Edition)" won't find a "In Rainbows" tag on a
 *     seeder's disk; a canonical title from MB gets past that.
 *   - Artist credit on MB is the definitive spelling. Deezer's "Kanye West"
 *     vs an uploader's "Ye" is a real miss when the raw string is the
 *     search term.
 *
 * On any failure — MB down, MBID isn't a release group, transient network
 * — return null so the caller falls back to whatever it had before.
 */
export async function canonicalizeAlbumFromMbid(
  mbid: string | null | undefined
): Promise<{ title: string; artist: string } | null> {
  if (!mbid) return null;
  try {
    const rg = await getReleaseGroup(mbid);
    const title = rg.title?.trim();
    const artist = rg['artist-credit']
      ?.map((c) => c.name ?? c.artist?.name)
      .filter((n): n is string => !!n && n.trim().length > 0)
      .join(', ')
      .trim();
    if (!title || !artist) return null;
    return { title, artist };
  } catch {
    return null;
  }
}
