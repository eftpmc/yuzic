import {
  doesTrackMatchProviderScope,
  getDownloadedTrackServerId,
  getDownloadedTrackServerType,
  inferServerTypeFromCoverKind,
  normalizeServerId,
  normalizeServerType,
} from './provider';

describe('download provider helpers', () => {
  it('normalizes only supported server types and non-empty server ids', () => {
    expect(normalizeServerType('navidrome')).toBe('navidrome');
    expect(normalizeServerType('jellyfin')).toBe('jellyfin');
    expect(normalizeServerType('emby')).toBe('emby');
    expect(normalizeServerType('spotify')).toBeNull();
    expect(normalizeServerId(' server-1 ')).toBe('server-1');
    expect(normalizeServerId('   ')).toBeNull();
  });

  it('reads provider metadata from current and legacy download records', () => {
    expect(getDownloadedTrackServerId({ serverId: 'server-1' })).toBe('server-1');
    expect(getDownloadedTrackServerType({ serverType: 'jellyfin' })).toBe('jellyfin');
    expect(getDownloadedTrackServerId({
      originalTrack: { extraPayload: { serverId: 'server-legacy' } },
    })).toBe('server-legacy');
    expect(getDownloadedTrackServerType({
      originalTrack: { extraPayload: { serverType: 'emby' } },
    })).toBe('emby');
  });

  it('falls back from cover kind when server type is absent', () => {
    expect(inferServerTypeFromCoverKind('navidrome')).toBe('navidrome');
    expect(getDownloadedTrackServerType({ coverKind: 'jellyfin' })).toBe('jellyfin');
    expect(getDownloadedTrackServerType({ coverKind: 'unknown' })).toBeNull();
  });

  it('matches delete scopes by server id first, then provider type', () => {
    const navidromeTrack = { serverId: 'server-a', serverType: 'navidrome' };
    const jellyfinTrack = { serverId: 'server-b', serverType: 'jellyfin' };

    expect(doesTrackMatchProviderScope(navidromeTrack, { serverId: 'server-a' })).toBe(true);
    expect(doesTrackMatchProviderScope(navidromeTrack, { serverId: 'server-b' })).toBe(false);
    expect(doesTrackMatchProviderScope(jellyfinTrack, { serverType: 'jellyfin' })).toBe(true);
    expect(doesTrackMatchProviderScope(jellyfinTrack, { serverType: 'navidrome' })).toBe(false);
  });

  it('does not match scoped deletes when track metadata is missing', () => {
    expect(doesTrackMatchProviderScope({}, { serverId: 'server-a' })).toBe(false);
    expect(doesTrackMatchProviderScope({}, { serverType: 'navidrome' })).toBe(false);
    expect(doesTrackMatchProviderScope({})).toBe(true);
  });

  it('does not match everything when an explicit scope resolves to nothing identifiable', () => {
    // Regression: a "clear this provider's downloads" scope built from a
    // corrupt/legacy download (e.g. an "unknown provider" row with no
    // serverId) used to fall through to the same branch as "no scope
    // passed at all" and match every track — turning a scoped clear into
    // a clear-all. An explicitly-passed scope that resolves to nothing
    // must match nothing, not everything.
    const track = { serverId: 'server-a', serverType: 'navidrome' };
    expect(doesTrackMatchProviderScope(track, { serverId: null, serverType: null })).toBe(false);
    expect(doesTrackMatchProviderScope(track, {})).toBe(false);
    expect(doesTrackMatchProviderScope(track, { serverId: '   ' })).toBe(false);
  });
});
