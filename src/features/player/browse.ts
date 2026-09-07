/**
 * The browsable tree the app hands to CarPlay and Android Auto.
 *
 * These were `@rntp/player`'s types, kept in the app's own shape — categories
 * of items — rather than adopting the engine's recursive `BrowseNode`,
 * because this is what `useCarPlayBrowseTree` already builds.
 * `createEngineBackend` converts.
 */

/**
 * One row: either a track or a folder of them.
 *
 * `url` and `children` are the discriminator, and both are optional because
 * the app builds both kinds. An Albums category holds album rows that carry
 * `children` and no `url`; those children are tracks that carry a `url` and
 * no children. A row with neither is a dead end and is filtered out before
 * publishing.
 */
export interface BrowseItem {
  mediaId: string;
  title: string;
  artist?: string;
  artworkUrl?: string;
  /** Set on playable rows. Its absence is what makes a row a folder. */
  url?: string;
  /** Seconds. */
  duration?: number;
  children?: BrowseItem[];
}

/** A top-level grouping — Favorites, Playlists, an album. */
export interface BrowseCategory {
  mediaId: string;
  title: string;
  items: BrowseItem[];
}
