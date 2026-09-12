/**
 * `metadata.enrich`: display-only artist-info gap-filling, never written back
 * to any server. See `docs/design-library-intent.md` §9 for the design and
 * `resolveArtwork.ts` for the artwork half of the pair — the two chains are
 * deliberately independent (a user can enable one without the other).
 *
 * GAPS ONLY: this resolver is only ever consulted when the caller already
 * knows the server/local entity has no bio — it does not itself decide that,
 * so it never overrides server data.
 *
 * DISPLAY ONLY: nothing here writes to a server, a file, or a tag. It only
 * returns data for the UI to render, alongside which source it came from so
 * the UI can draw the small "via …" source line.
 */

/** Every artist-info source the app knows how to fill this slot with. */
export type ArtistInfoSourceId = 'lastfm';

export const ALL_ARTIST_INFO_SOURCES: readonly ArtistInfoSourceId[] = ['lastfm'];

export type ArtistInfoResult = {
  bio: string | null;
  tags: string[];
  /** Which source produced this — drives the "via Last.fm" source line. */
  source: ArtistInfoSourceId;
};

/** Enough about the artist for a source to look itself up. */
export type ArtistInfoInput = {
  name: string;
  mbid?: string | null;
};

export type ArtistInfoFetcher = (artist: ArtistInfoInput) => Promise<ArtistInfoResult | null>;

/** One fetcher per source id. Adding a second launch source only means an
 *  entry here and in `ALL_ARTIST_INFO_SOURCES`. */
export type ArtistInfoFetchers = Partial<Record<ArtistInfoSourceId, ArtistInfoFetcher>>;

export type ResolveArtistInfoInput = {
  artist: ArtistInfoInput;
  /** The user's fallback order, enabled sources only, most-preferred first.
   *  Disabled sources are simply absent — there is no separate bit to
   *  reconcile against the order here. An empty list (the default, since
   *  metadata enrichment ships off) makes this resolver a no-op, which is
   *  exactly what "disabling restores the server view" requires. */
  enabledSourcesInOrder: ArtistInfoSourceId[];
  fetchers: ArtistInfoFetchers;
};

/**
 * Tries each enabled source in the user's order, stopping at the first one
 * that returns a non-empty bio or tag list. Returns `null` when every source
 * misses or none are enabled — the caller falls back to showing nothing,
 * which is what the server-only view already does today.
 */
export async function resolveArtistInfo(input: ResolveArtistInfoInput): Promise<ArtistInfoResult | null> {
  const { artist, enabledSourcesInOrder, fetchers } = input;

  for (const sourceId of enabledSourcesInOrder) {
    const fetcher = fetchers[sourceId];
    if (!fetcher) continue;

    const result = await fetcher(artist);
    if (result && (result.bio || result.tags.length > 0)) {
      return result;
    }
  }

  return null;
}
