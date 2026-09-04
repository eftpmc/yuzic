import { normalize } from '@/utils/normalize';

/**
 * Matches a Soulseek queue entry against the album a screen is showing, to
 * decide whether that album is currently downloading.
 *
 * Soulseek gives no album identity — only the remote directory a transfer came
 * from — so this is inherently fuzzy. Lidarr, which does report an album and
 * artist, is matched exactly elsewhere.
 */

/**
 * Below this many characters a containment test stops meaning anything: a
 * queue entry from a folder called "EP" would otherwise match Sleep, Deep and
 * Repeat alike. Short titles are real ("X", "÷", "1989"), so they are matched
 * exactly rather than excluded.
 */
const MIN_LENGTH_FOR_CONTAINMENT = 4;

export type QueuedRelease = {
  title: string;
  /** Read from the remote path, so often empty. */
  artistName?: string;
};

export type AlbumIdentity = {
  title: string;
  artist: string;
};

function looselyEqual(left: string, right: string): boolean {
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length < MIN_LENGTH_FOR_CONTAINMENT || right.length < MIN_LENGTH_FOR_CONTAINMENT) {
    return false;
  }
  return left.includes(right) || right.includes(left);
}

export function matchesQueuedRelease(
  record: QueuedRelease,
  album: AlbumIdentity
): boolean {
  if (!looselyEqual(normalize(record.title), normalize(album.title))) return false;

  // The artist is only known when the remote path revealed one. When it did,
  // it has to agree — two artists' "Greatest Hits" are not the same download.
  const recordArtist = normalize(record.artistName ?? '');
  if (!recordArtist) return true;
  return looselyEqual(recordArtist, normalize(album.artist));
}
