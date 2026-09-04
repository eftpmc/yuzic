import type { MediaItem } from '@rntp/player';

import type { Song } from '@/types';

/**
 * Conversions and guards between the app's `Song` and the player's `MediaItem`.
 *
 * Split out of PlayingContext because these decide what reaches the native
 * player: hand it a track with no usable URL and playback fails at the point
 * the user pressed play, with nothing in the UI explaining why.
 */

export function getMediaItemId(item: MediaItem): string {
  return item.mediaId ?? (typeof item.url === 'string' ? item.url : '');
}

/** The player accepts a plain URL or a `{ uri }` source; normalise both. */
export function getMediaItemUrl(item: MediaItem): string {
  if (typeof item.url === 'string') return item.url;
  if (typeof item.url === 'object' && item.url && 'uri' in item.url) {
    return typeof item.url.uri === 'string' ? item.url.uri : '';
  }
  return '';
}

/**
 * Rebuilds a minimal Song from what the player reports, for when the native
 * queue holds a track the app's own queue has lost track of. Null when the
 * item lacks the identity or URL that makes it playable at all.
 */
export function mediaItemToFallbackSong(item: MediaItem): Song | null {
  const id = getMediaItemId(item);
  const streamUrl = getMediaItemUrl(item);
  if (!id || !streamUrl) return null;
  return {
    id,
    title: item.title ?? '',
    artist: item.artist ?? '',
    albumId: '',
    artistId: '',
    duration: String(item.duration ?? 0),
    streamUrl,
    cover: { kind: 'none' },
  } as Song;
}

export function hasSameQueueIds(current: Song[], next: Song[]): boolean {
  return (
    current.length === next.length &&
    current.every((song, index) => song.id === next[index]?.id)
  );
}

/** Coarse origin of a track's media, used for error reporting and recovery. */
export function getSourceKind(song: Song | null): string {
  if (!song?.streamUrl) return 'none';
  if (song.filePath || song.streamUrl.startsWith('file:')) return 'file';
  if (song.streamUrl.startsWith('http://') || song.streamUrl.startsWith('https://')) {
    return 'remote';
  }
  return 'unknown';
}

/**
 * Whether the player can actually open this track: a remote URL, a file URL,
 * or a bare absolute path. Anything else — an empty string, a relative path, a
 * scheme the player can't open — would fail inside the native player.
 */
export function hasPlayableMediaUrl(song: Song): boolean {
  const url = song.streamUrl?.trim();
  if (!url) return false;
  return (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('file://') ||
    url.startsWith('/')
  );
}

/** Fails loudly for an explicit play request, where silently dropping the
 * track would look like the button did nothing. */
export function assertPlayableSongs(songs: Song[]) {
  const invalid = songs.find(song => !hasPlayableMediaUrl(song));
  if (invalid) {
    throw new Error(`Track has no playable media URL: ${invalid.id}`);
  }
}

/** Drops unplayable tracks, for queue fills where the rest should still play. */
export function playableSongsOnly(songs: Song[]): Song[] {
  return songs.filter(hasPlayableMediaUrl);
}
