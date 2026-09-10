export type SearchScope = 'client' | 'server';

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
 * device stays online); `deviceOnline` is about the internet at large. Deezer
 * needs only the second — an unreachable Navidrome says nothing about whether
 * Deezer is up — so folding them into one flag would silently drop external
 * results in the most common failure case.
 *
 * **Scope is one or the other, not a set.** `searchScope` is a single value and
 * the old code tested it with `String.prototype.includes`, which reads like an
 * array check and is not one. It happened to be correct, but it hid the
 * consequence: the default scope is `'server'`, so with the server unreachable
 * there was no local leg to fall back to and an offline search returned nothing
 * at all. Hence `client` below is *not* simply `scope === 'client'` — a server
 * scope degrades to the local index rather than to an empty screen, which is
 * the whole point of having a synced library.
 */

export type SearchLegPlan = {
  /** Search the locally synced library index. */
  client: boolean;
  /** Ask the music server. */
  server: boolean;
  /** Ask Deezer. */
  external: boolean;
  /**
   * A leg the filters asked for was skipped because it couldn't be reached, so
   * the results are narrower than requested through no fault of the query.
   */
  degraded: boolean;
};

export function planSearchLegs({
  filters,
  searchScope,
  serverReachable,
  deviceOnline,
}: {
  filters: { local: boolean; deezer: boolean };
  searchScope: SearchScope;
  serverReachable: boolean;
  deviceOnline: boolean;
}): SearchLegPlan {
  const wantsServer = filters.local && searchScope === 'server';
  const wantsExternal = filters.deezer;

  const server = wantsServer && serverReachable;
  const external = wantsExternal && deviceOnline;

  // The local index when it was asked for, and also whenever the server leg
  // was wanted but can't run — otherwise the default scope means an offline
  // search over a fully synced library shows nothing.
  const client = filters.local && (searchScope === 'client' || (wantsServer && !server));

  return {
    client,
    server,
    external,
    degraded: (wantsServer && !server) || (wantsExternal && !external),
  };
}
