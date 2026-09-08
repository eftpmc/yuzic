/**
 * What the app calls a playable item.
 *
 * This used to be `@rntp/player`'s `MediaItem`, imported into a dozen files
 * that had no other reason to know a player library existed — builders,
 * selectors, a Redux slice. Owning it here is what let that library be removed
 * without touching any of them beyond the import line.
 *
 * Deliberately smaller than the type it replaces. It carries the eight fields
 * this app actually sets, and none of the ones it never did: no `extras`, no
 * `isLive`, no bundle-relative asset forms. A field nobody writes is a field
 * that silently stops being populated, and the type should not promise one.
 *
 * `url` keeps the two forms the app actually produces and drops the rest —
 * no require()-style asset numbers or bundle-relative names, since every URL
 * here is a server URL or a local file path resolved at runtime.
 */
export type MediaUrl = string | { uri: string };

export interface MediaItem {
  /**
   * Stable identity, used to match a playing item back to a library track.
   * Distinct from `url`: stream URLs carry a quality parameter and a token,
   * so the same track has different URLs at different times and the URL
   * cannot stand in for identity.
   */
  mediaId?: string;
  /**
   * A bare string for remote streams; `{ uri }` for local files. Both forms
   * are in use — `buildTrackItem` wraps `file://` and leaves http alone — so
   * read it through `getMediaItemUrl` rather than assuming either.
   */
  url: MediaUrl;
  title?: string;
  artist?: string;
  albumTitle?: string;
  artworkUrl?: string;
  /** Seconds. A hint for the UI, not authoritative — the engine measures it. */
  duration?: number;
  /**
   * Set when the URL has no file extension to identify the format by. Bare
   * stream endpoints are the case that needs it.
   */
  mimeType?: string;
}

/** What to do when the queue runs out. */
export enum RepeatMode {
  Off = 'off',
  Track = 'track',
  Queue = 'queue',
}
