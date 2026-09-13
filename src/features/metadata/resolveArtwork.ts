/**
 * `metadata.enrich`: display-only artwork gap-filling. Mirrors
 * `resolveArtistInfo.ts`'s shape but is an intentionally independent chain —
 * a user can enable artist-info without artwork, or vice versa (LOCKED
 * DESIGN, see the D3 task). Never writes to a server; only ever consulted
 * when the caller already knows the entity has no artwork of its own.
 */

import type { CoverSource } from '@/types/Cover';

/** Every artwork source the app knows how to fill this slot with. */
export type ArtworkSourceId = 'deezer' | 'coverartarchive';


export type ArtworkResult = {
  cover: CoverSource;
  /** Which source produced this — drives the "via Deezer" / "via Cover Art
   *  Archive" source line. */
  source: ArtworkSourceId;
};

/** Enough about the entity for a source to look itself up. `mbid` is what
 *  Cover Art Archive needs (a release or release-group MBID); `name` is
 *  what Deezer's artist-image lookup needs. Either may be absent. */
export type ArtworkLookupInput = {
  name: string;
  mbid?: string | null;
  mbidType?: 'release' | 'release-group' | 'unknown';
};

export type ArtworkFetcher = (entity: ArtworkLookupInput) => Promise<ArtworkResult | null>;

/** One fetcher per source id. */
export type ArtworkFetchers = Partial<Record<ArtworkSourceId, ArtworkFetcher>>;

export type ResolveArtworkInput = {
  entity: ArtworkLookupInput;
  /** The user's fallback order, enabled sources only, most-preferred first.
   *  Empty (the default) makes this resolver a no-op. */
  enabledSourcesInOrder: ArtworkSourceId[];
  fetchers: ArtworkFetchers;
};

/**
 * Tries each enabled source in order, stopping at the first hit. Returns
 * `null` when every source misses or none are enabled, so the caller keeps
 * showing whatever placeholder/server cover it already had.
 */
export async function resolveArtwork(input: ResolveArtworkInput): Promise<ArtworkResult | null> {
  const { entity, enabledSourcesInOrder, fetchers } = input;

  for (const sourceId of enabledSourcesInOrder) {
    const fetcher = fetchers[sourceId];
    if (!fetcher) continue;

    const result = await fetcher(entity);
    if (result && result.cover.kind !== 'none') {
      return result;
    }
  }

  return null;
}
