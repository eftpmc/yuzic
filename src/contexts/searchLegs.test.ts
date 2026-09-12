import { planSearchLegs } from './searchLegs';

describe('planSearchLegs', () => {
  it('attempts the server leg for the library scope when everything is reachable', () => {
    expect(planSearchLegs({
      resultScope: 'library',
      enabledExternalSourceIds: [],
      searchScope: 'server',
      serverReachable: true,
      deviceOnline: true,
    })).toEqual({ client: false, server: true, externalSources: [], degraded: false });
  });

  it('searches the local index when that is the chosen scope', () => {
    const plan = planSearchLegs({
      resultScope: 'library',
      enabledExternalSourceIds: [],
      searchScope: 'client',
      serverReachable: true,
      deviceOnline: true,
    });
    expect(plan).toEqual({ client: true, server: false, externalSources: [], degraded: false });
  });

  // The regression this file exists for: offline, the server leg was still
  // attempted, hung to its timeout on every keystroke, and then landed in the
  // same catch as a real failure — so results that had succeeded locally were
  // shown under an error banner.
  it('reports a skipped leg as degraded rather than failed', () => {
    expect(planSearchLegs({
      resultScope: 'library',
      enabledExternalSourceIds: [],
      searchScope: 'server',
      serverReachable: false,
      deviceOnline: true,
    }).degraded).toBe(true);
  });

  // The default scope is 'server'. Without this fallback an offline search
  // over a fully synced library returns nothing at all, which is what it did.
  it('falls back to the local index when the server scope cannot be reached', () => {
    const plan = planSearchLegs({
      resultScope: 'library',
      enabledExternalSourceIds: [],
      searchScope: 'server',
      serverReachable: false,
      deviceOnline: false,
    });
    expect(plan.client).toBe(true);
    expect(plan.server).toBe(false);
    expect(plan.degraded).toBe(true);
  });

  it('is not degraded when nothing was asked for beyond the local index', () => {
    expect(planSearchLegs({
      resultScope: 'library',
      enabledExternalSourceIds: [],
      searchScope: 'client',
      serverReachable: false,
      deviceOnline: false,
    })).toEqual({ client: true, server: false, externalSources: [], degraded: false });
  });

  describe('resultScope: other (the external-search action)', () => {
    it('never plans a library leg alongside external ones — the two are not mixed by default', () => {
      const plan = planSearchLegs({
        resultScope: 'other',
        enabledExternalSourceIds: ['deezer', 'musicbrainz'],
        searchScope: 'server',
        serverReachable: true,
        deviceOnline: true,
      });
      expect(plan.client).toBe(false);
      expect(plan.server).toBe(false);
      expect(plan.externalSources.sort()).toEqual(['deezer', 'musicbrainz']);
    });

    it('queries only the sources the Filters sheet enabled', () => {
      const plan = planSearchLegs({
        resultScope: 'other',
        enabledExternalSourceIds: ['musicbrainz'],
        searchScope: 'server',
        serverReachable: true,
        deviceOnline: true,
      });
      expect(plan.externalSources).toEqual(['musicbrainz']);
    });

    it('drops every external source when the device is offline', () => {
      const plan = planSearchLegs({
        resultScope: 'other',
        enabledExternalSourceIds: ['deezer'],
        searchScope: 'server',
        serverReachable: true,
        deviceOnline: false,
      });
      expect(plan.externalSources).toEqual([]);
      expect(plan.degraded).toBe(true);
    });

    it('is not degraded when the scope was asked for with no sources enabled at all', () => {
      // Nothing to attempt is not the same as something failing to reach.
      const plan = planSearchLegs({
        resultScope: 'other',
        enabledExternalSourceIds: [],
        searchScope: 'server',
        serverReachable: true,
        deviceOnline: true,
      });
      expect(plan.externalSources).toEqual([]);
      expect(plan.degraded).toBe(false);
    });

    it('never attempts the library legs even when the search scope is client', () => {
      const plan = planSearchLegs({
        resultScope: 'other',
        enabledExternalSourceIds: ['deezer'],
        searchScope: 'client',
        serverReachable: true,
        deviceOnline: true,
      });
      expect(plan.client).toBe(false);
      expect(plan.server).toBe(false);
    });
  });
});
