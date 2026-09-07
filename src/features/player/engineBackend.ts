import type { MediaItem } from './mediaItem';
import type { EngineEvent, Progress, Track } from 'yuzic-engine';

/**
 * yuzic-engine, wearing the shape the app already talks to.
 *
 * The app has ~40 `TrackPlayer.*` call sites across seven files, and rewriting
 * them to swap engines would be one enormous change that either works or does
 * not. This is the alternative: one module that answers the same calls, so the
 * swap becomes a choice of backend rather than a rewrite, and the two can be
 * compared on the same device by flipping it.
 *
 * **The obstacle this exists to solve is that the two APIs disagree about
 * time.** `TrackPlayer.getProgress()` returns a value; the engine returns a
 * promise, because it has to cross a bridge. Call sites like
 * `Math.floor(TrackPlayer.getProgress().position)` cannot be made async
 * without touching every one of them, which is the change this is avoiding.
 *
 * So the backend keeps a shadow — the last progress the engine reported, the
 * queue as it was last set, the index as of the last track change — and the
 * synchronous getters read from that. It is a cache of things the engine has
 * already said, not a guess: the engine pushes progress about four times a
 * second and pushes every track change, so the shadow is never far behind, and
 * the figures it serves were true when they were sent.
 *
 * What that costs is honesty about staleness, and it is worth stating plainly:
 * a `getProgress()` immediately after `seekTo()` returns the position before
 * the seek, until the next progress event lands. rntp has the same property
 * for the same reason — its "synchronous" getter is reading a cache the native
 * side pushes into — so this is not a regression, but it is a thing to know.
 */

/** The queue as the app hands it over, kept so the sync getters can answer. */
interface Shadow {
  queue: MediaItem[];
  activeIndex: number;
  progress: Progress;
  playing: boolean;
}

const EMPTY_PROGRESS: Progress = { positionSec: 0, durationSec: 0, bufferedSec: 0 };

export function createShadow(): Shadow {
  return { queue: [], activeIndex: 0, progress: EMPTY_PROGRESS, playing: false };
}

/**
 * Fold an engine event into the shadow, returning the next one.
 *
 * Pure, and separated from the module that owns a shadow, because this is the
 * part worth testing: every synchronous answer the app gets is derived from
 * whatever this function last decided, so a mistake here is a progress bar
 * that lies rather than an error anyone sees.
 */
export function applyEvent(shadow: Shadow, event: EngineEvent): Shadow {
  switch (event.type) {
    case 'progress':
      return { ...shadow, progress: event.progress };

    case 'trackChange':
      // Position resets with the track. Carrying the old one forward would
      // show the new track starting wherever the last one ended, for the
      // fraction of a second until the next progress event corrects it —
      // visible as a jump backwards on every track change.
      return {
        ...shadow,
        activeIndex: event.index,
        progress: { ...EMPTY_PROGRESS, durationSec: shadow.queue[event.index]?.duration ?? 0 },
      };

    case 'stateChange':
      return { ...shadow, playing: event.state === 'playing' };

    default:
      // queueChange carries no payload, and error/remoteCommand are the
      // host's business rather than the shadow's.
      return shadow;
  }
}

/**
 * The URL, as a string the engine can open.
 *
 * rntp's `MediaUrl` is three things: a string, `{ uri }` (which
 * `buildTrackItem` produces for local files), or a **number** — a bundled
 * asset from `require('./sound.mp3')`. The engine fetches over HTTP or reads
 * `file://` and has no notion of the bundle, so a numeric asset has no
 * translation.
 *
 * Empty string rather than a throw: yuzic never builds one, so this is a
 * shape the type permits and the app does not use, and failing the whole
 * queue over an item that cannot occur would be the worse trade. It surfaces
 * as a playback error on that track if it ever does.
 */
function engineUri(url: MediaItem['url'] | undefined): string {
  if (typeof url === 'string') return url;
  if (typeof url === 'number') return '';
  if (url && typeof url.uri === 'string') return url.uri;
  return '';
}

/**
 * The app's `MediaItem` as the engine's `Track`.
 */
export function toEngineTrack(item: MediaItem): Track {
  const uri = engineUri(item.url);
  return {
    // `mediaId` is optional to rntp and always set by `buildTrackItem`, but the
    // engine keys its disk cache on this — so falling back to the URL keeps a
    // track that omits one cacheable under *something* stable, rather than
    // every such track sharing the empty-string entry.
    id: item.mediaId ?? uri,
    uri,
    title: item.title ?? '',
    artist: item.artist,
    album: item.albumTitle || undefined,
    artworkUri: engineUri(item.artworkUrl) || undefined,
    // Absent, not zero: the engine treats an unknown duration differently from
    // a zero one when it clamps a crossfade.
    durationSec: item.duration,
  };
}

/** And back, for the queue getter the app reads synchronously. */
export function toMediaItem(track: Track): MediaItem {
  return {
    mediaId: track.id,
    title: track.title,
    artist: track.artist,
    albumTitle: track.album ?? '',
    duration: track.durationSec,
    url: track.uri,
    artworkUrl: track.artworkUri,
  };
}

/**
 * The progress shape the app expects, from the engine's.
 *
 * Two renames and one semantic difference. The engine reports `bufferedSec` on
 * the same timeline as the position — 14 means "buffered up to 0:14" — whereas
 * a caller asking "how much runway is left" wants the difference. Converted
 * here rather than changed in the engine, because absolute is the right answer
 * for drawing a buffering bar and this is the one caller that wants otherwise.
 */
export function toRntpProgress(progress: Progress): {
  position: number;
  duration: number;
  buffered: number;
} {
  return {
    position: progress.positionSec,
    duration: progress.durationSec,
    buffered: Math.max(0, progress.bufferedSec - progress.positionSec),
  };
}

export type { Shadow };
