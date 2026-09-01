/**
 * Recovers an artist and album from a Soulseek share path.
 *
 * A transfer only tells us the remote directory a file came from, so the queue
 * used to label every row with the peer's username where the artist belongs —
 * "some_peer_42 · 12 files" rather than "Radiohead · 12 files". Sharers do
 * follow recognisable layouts, and this reads the common ones; when none fits,
 * the caller keeps showing the username rather than inventing an artist.
 */

export type ParsedDirectory = {
  albumTitle: string;
  /** Absent when the layout doesn't reveal one. */
  artistName?: string;
};

/** Folders that hold a library rather than name an artist. */
const CONTAINER_SEGMENTS = new Set([
  'album', 'albums', 'audio', 'collection', 'complete', 'completed', 'download',
  'downloads', 'flac', 'flacs', 'incoming', 'itunes', 'library', 'media', 'mp3',
  'mp3s', 'music', 'musica', 'musique', 'musik', 'my music', 'new', 'share',
  'shared', 'sharing', 'slsk', 'slskd', 'sorted', 'soulseek', 'upload', 'uploads',
]);

const DISC_FOLDER = /^(cd|disc|disk)[\s._-]*\d+$/i;
const YEAR_ONLY = /^\(?((19|20)\d{2})\)?$/;

/** Splits a Windows- or Unix-style path, dropping Soulseek's `@@hash` root and drive letters. */
function segments(directory: string): string[] {
  return directory
    .replace(/\//g, '\\')
    .split('\\')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment, index) => {
      if (index > 0) return true;
      // Soulseek prefixes a share root with `@@` plus an opaque token.
      return !/^@@/.test(segment) && !/^[a-z]:$/i.test(segment);
    });
}

function isContainer(segment: string): boolean {
  return CONTAINER_SEGMENTS.has(segment.toLowerCase());
}

export function parseDirectory(directory: string): ParsedDirectory {
  const parts = segments(directory);

  // "…\In Rainbows\CD1" names the album one level up.
  while (parts.length > 1 && DISC_FOLDER.test(parts[parts.length - 1])) {
    parts.pop();
  }

  const base = parts[parts.length - 1] ?? '';
  const parent = parts[parts.length - 2];
  const parentArtist = parent && !isContainer(parent) ? parent : undefined;

  if (!base) {
    return { albumTitle: '', artistName: parentArtist };
  }

  const split = base.match(/^(.+?)\s+-\s+(.+)$/);
  if (split) {
    const [, left, right] = split;
    // "In Rainbows - Disc 1" is one album, not an artist and an album.
    if (!DISC_FOLDER.test(right)) {
      // "2007 - In Rainbows" is a year prefix, not an artist.
      if (YEAR_ONLY.test(left)) {
        return { albumTitle: right, artistName: parentArtist };
      }
      return { albumTitle: right, artistName: left };
    }
  }

  return { albumTitle: base, artistName: parentArtist };
}
