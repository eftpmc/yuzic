import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '@/utils/redux/store';
import type { ScrobbleDestinationKind, ScrobbleRoute } from '@/utils/redux/slices/settingsSlice';
import { selectActiveServerId } from '@/utils/redux/selectors/serversSelectors';

/**
 * Per-destination route for the active server, derived with NO migration.
 *
 * A server that stored an explicit route (via `setScrobbleRoute`) always
 * reads that back. A server that never has — every server that existed
 * before this feature, and every new server that hasn't visited the
 * Scrobbling screen yet — gets a route derived on the fly from today's two
 * independent booleans:
 *  - lastfm: `serverScrobbleEnabled` maps to 'through-server' (the server is
 *    what would forward to Last.fm), off maps to 'disabled'. Never 'direct'
 *    — Last.fm-direct isn't built this cut.
 *  - listenbrainz: today's two switches were never meant to combine, but a
 *    route can only hold one value, so 'direct' (yuzic's own LB scrobble)
 *    wins when both happen to be on, since it strictly subsumes what
 *    'through-server' would forward. Only `serverScrobbleEnabled` on and per-
 *    server LB scrobble off means 'through-server'; LB on alone means
 *    'direct'; both off means 'disabled'.
 *
 * Deriving at read time rather than writing a migration means an upgrading
 * user sees the same effective behaviour as before with zero new state, and
 * a fresh install with the defaults (`serverScrobbleEnabled: true`, LB
 * per-server scrobble off) derives to lastfm 'through-server' / listenbrainz
 * 'through-server' — matching the two booleans' own defaults.
 */
export function deriveScrobbleRoute(
  destination: ScrobbleDestinationKind,
  serverScrobbleEnabled: boolean,
  lbScrobbleEnabled: boolean
): ScrobbleRoute {
  if (destination === 'lastfm') {
    return serverScrobbleEnabled ? 'through-server' : 'disabled';
  }
  // listenbrainz
  if (lbScrobbleEnabled) return 'direct';
  if (serverScrobbleEnabled) return 'through-server';
  return 'disabled';
}

const selectScrobbleRoutesForActiveServer = createSelector(
  [(s: RootState) => s.settings.scrobbleRoutes, selectActiveServerId],
  (scrobbleRoutes, activeServerId) =>
    (activeServerId ? scrobbleRoutes?.[activeServerId] : undefined)
);

export const selectScrobbleRoute = (destination: ScrobbleDestinationKind) =>
  createSelector(
    [
      selectScrobbleRoutesForActiveServer,
      (s: RootState) => s.settings.serverScrobbleEnabled ?? true,
      (s: RootState) => {
        const activeServerId = s.servers.activeServerId;
        const entry = activeServerId ? s.listenbrainz.byServer[activeServerId] : undefined;
        return entry?.scrobbleEnabled ?? false;
      },
    ],
    (routes, serverScrobbleEnabled, lbScrobbleEnabled): ScrobbleRoute => {
      const stored = routes?.[destination];
      if (stored) return stored;
      return deriveScrobbleRoute(destination, serverScrobbleEnabled, lbScrobbleEnabled);
    }
  );

export const selectLastfmScrobbleRoute = selectScrobbleRoute('lastfm');
export const selectListenBrainzScrobbleRoute = selectScrobbleRoute('listenbrainz');
