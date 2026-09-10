import { planSearchLegs } from './searchLegs';

const BOTH_FILTERS = { local: true, deezer: true };

describe('planSearchLegs', () => {
  it('attempts every leg the scope asks for when everything is reachable', () => {
    expect(planSearchLegs({
      filters: BOTH_FILTERS,
      searchScope: 'server',
      serverReachable: true,
      deviceOnline: true,
    })).toEqual({ client: false, server: true, external: true, degraded: false });
  });

  it('searches the local index when that is the chosen scope', () => {
    const plan = planSearchLegs({
      filters: { local: true, deezer: false },
      searchScope: 'client',
      serverReachable: true,
      deviceOnline: true,
    });
    expect(plan).toEqual({ client: true, server: false, external: false, degraded: false });
  });

  // The regression this file exists for: offline, the server leg was still
  // attempted, hung to its timeout on every keystroke, and then landed in the
  // same catch as a real failure — so results that had succeeded locally were
  // shown under an error banner.
  it('reports a skipped leg as degraded rather than failed', () => {
    expect(planSearchLegs({
      filters: BOTH_FILTERS,
      searchScope: 'server',
      serverReachable: false,
      deviceOnline: true,
    }).degraded).toBe(true);
  });

  // The default scope is 'server'. Without this fallback an offline search
  // over a fully synced library returns nothing at all, which is what it did.
  it('falls back to the local index when the server scope cannot be reached', () => {
    const plan = planSearchLegs({
      filters: { local: true, deezer: false },
      searchScope: 'server',
      serverReachable: false,
      deviceOnline: false,
    });
    expect(plan.client).toBe(true);
    expect(plan.server).toBe(false);
    expect(plan.degraded).toBe(true);
  });

  it('still asks Deezer when only the music server is unreachable', () => {
    // A downed VPN takes the server away while the internet is fine. Folding
    // both into one flag would drop external results in that exact case.
    const plan = planSearchLegs({
      filters: BOTH_FILTERS,
      searchScope: 'server',
      serverReachable: false,
      deviceOnline: true,
    });
    expect(plan.server).toBe(false);
    expect(plan.external).toBe(true);
  });

  it('is not degraded when the only unreachable leg was never asked for', () => {
    expect(planSearchLegs({
      filters: { local: true, deezer: false },
      searchScope: 'client',
      serverReachable: false,
      deviceOnline: false,
    })).toEqual({ client: true, server: false, external: false, degraded: false });
  });

  it('drops the local legs entirely when the local filter is off', () => {
    const plan = planSearchLegs({
      filters: { local: false, deezer: true },
      searchScope: 'server',
      serverReachable: false,
      deviceOnline: true,
    });
    expect(plan.client).toBe(false);
    expect(plan.server).toBe(false);
    expect(plan.external).toBe(true);
    expect(plan.degraded).toBe(false);
  });
});
