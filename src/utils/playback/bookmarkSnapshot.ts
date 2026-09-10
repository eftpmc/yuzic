import type { Song } from '@/types';
import type { BookmarkSnapshot } from '@/utils/redux/slices/playbackSlice';
import { isPodcastEpisode, PODCAST_EPISODE_ID_PREFIX } from './contentKind';

/**
 * Whether a resume position needs a stored snapshot to be renderable later.
 *
 * A library track does not: "Continue Playing" joins it against the synced
 * library by id, which stays authoritative for re-tagging and artwork. A
 * podcast episode is never in that library — `buildPodcastSong` namespaces its
 * id with `podcast:` exactly so it cannot collide with a real track — so a
 * bookmark with no snapshot is one nothing can draw.
 *
 * Keyed off the id namespace rather than `contentKind` alone, because the
 * namespace is what actually decides whether the library join can succeed, and
 * a Song rebuilt from a snapshot may arrive without its kind.
 */
export function needsSnapshot(song: Song): boolean {
  return isPodcastEpisode(song) || song.id.startsWith(PODCAST_EPISODE_ID_PREFIX);
}

/**
 * The credential-free part of a Song, for persisting beside a resume position.
 *
 * `streamUrl` is deliberately dropped. `buildStreamUrl` signs it with the
 * user's token, and this ends up in a slice that is written to disk — storing
 * it would put credentials in app storage and freeze them at whatever they
 * were when the bookmark was written. The id is kept instead and the URL is
 * rebuilt at play time.
 */
export function toBookmarkSnapshot(song: Song): BookmarkSnapshot {
  return {
    title: song.title,
    artist: song.artist,
    cover: song.cover,
    duration: song.duration,
    contentKind: song.contentKind,
    streamId: song.streamId,
    channelId: song.albumId || undefined,
  };
}

/**
 * Rebuild a playable Song from a stored snapshot.
 *
 * The caller supplies the stream URL because building one needs an api client
 * bound to the active server, and this stays pure so it can be tested without
 * one — the same split `podcastEpisodeToSong` already uses.
 */
export function songFromBookmarkSnapshot(
  songId: string,
  snapshot: BookmarkSnapshot,
  streamUrl: string,
): Song {
  return {
    id: songId,
    title: snapshot.title,
    artist: snapshot.artist,
    artistId: '',
    albumId: snapshot.channelId ?? '',
    albumTitle: snapshot.artist,
    cover: snapshot.cover ?? { kind: 'letter', name: snapshot.title },
    duration: snapshot.duration ?? '0',
    streamUrl,
    contentKind: snapshot.contentKind,
  };
}
