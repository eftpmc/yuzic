export type SearchScope = 'client' | 'server';

/** The scope of a search: the user's own library, or intentionally reaching
 *  out to other sources. Distinct from `SearchScope` above, which is about
 *  *how* the library leg is fetched (locally-indexed vs. the music server),
 *  not about whether external sources are in play at all. */
export type SearchResultScope = 'library' | 'other';

/**
 * Which legs of a search are worth attempting.
 *
 * Extracted from `SearchContext` because the interesting part is a decision,
 * not a fetch: a leg that cannot land should not be *attempted*, and a leg that
 * was deliberately skipped is not a leg that *failed*. Getting the second half
 * wrong is what made offline search read as broken — the local results arrived
 * fine and were then shown underneath an error banner, because the skipped
 * server call had fallen into the same `catch` as a real failure.
 *
 * The two reachability inputs are deliberately separate. `serverReachable` is
 * about the user's own music server (which a downed VPN takes away while the
 * device stays online); `deviceOnline` is about the internet at large. External
 * sources need only the second — an unreachable Navidrome says nothing about
 * whether Deezer or MusicBrainz are up — so folding them into one flag would
 * silently drop external results in the most common failure case.
 *
 * **Scope is one or the other, not a set.** `searchScope` is a single value and
 * the old code tested it with `String.prototype.includes`, which reads like an
 * array check and is not one. It happened to be correct, but it hid the
 * consequence: the default scope is `'server'`, so with the server unreachable
 * there was no local leg to fall back to and an offline search returned nothing
 * at all. Hence `client` below is *not* simply `scope === 'client'` — a server
 * scope degrades to the local index rather than to an empty screen, which is
 * the whole point of having a synced library.
 *
 * **Library and external are never both attempted.** `resultScope` decides
 * which family runs at all: `'library'` only ever plans the client/server
 * legs, `'other'` only ever plans external ones — the segmented Search UI's
 * "Your Library" / "Other sources" choice, not an additional filter on top of
 * it. Mixing the two by default was explicitly ruled out.
 */
export type SearchLegPlan = {
  /** Search the locally synced library index. */
  client: boolean;
  /** Ask the music server. */
  server: boolean;
  /** Which external sources to query — empty unless `resultScope` is `'other'`. */
  externalSources: string[];
  /**
   * A leg the filters asked for was skipped because it couldn't be reached, so
   * the results are narrower than requested through no fault of the query.
   */
  degraded: boolean;
};

export function planSearchLegs({
  resultScope,
  enabledExternalSourceIds,
  searchScope,
  serverReachable,
  deviceOnline,
}: {
  /** 'library' (default) or 'other' — the segmented scope control's value. */
  resultScope: SearchResultScope;
  /** Source ids enabled for search AND selected in the Filters sheet. */
  enabledExternalSourceIds: string[];
  searchScope: SearchScope;
  serverReachable: boolean;
  deviceOnline: boolean;
}): SearchLegPlan {
  const isLibraryScope = resultScope === 'library';
  const isOtherScope = resultScope === 'other';

  const wantsServer = isLibraryScope && searchScope === 'server';
  const wantsExternal = isOtherScope && enabledExternalSourceIds.length > 0;

  const server = wantsServer && serverReachable;
  const externalSources = wantsExternal && deviceOnline ? enabledExternalSourceIds : [];

  // The local index when the library scope was asked for, and also whenever
  // the server leg was wanted but can't run — otherwise the default scope
  // means an offline search over a fully synced library shows nothing.
  const client = isLibraryScope && (searchScope === 'client' || (wantsServer && !server));

  return {
    client,
    server,
    externalSources,
    degraded: (wantsServer && !server) || (wantsExternal && externalSources.length === 0),
  };
}
