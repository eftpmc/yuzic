import type { DownloadedCollectionEntry } from './downloadStore';
import type { PersistedDownloadJob } from './localDownloadStore';
import {
  collectionsWithoutTracks,
  jobMatchesCollectionId,
  jobMatchesDownloadId,
  jobsOutsideScope,
  orphanedTrackIds,
  trackIdsOfJobs,
  tracksInCollectionRemoval,
  tracksInScope,
  tracksWithout,
} from './removal';
import type { LocalDownloadedTrackEntry } from './restore';

function track(
  trackId: string,
  overrides: Partial<LocalDownloadedTrackEntry> = {}
): LocalDownloadedTrackEntry {
  return {
    trackId,
    serverId: 'server-1',
    serverType: 'navidrome',
    coverKind: 'navidrome',
    localPath: `file:///downloads/${trackId}.mp3`,
    ...overrides,
  } as LocalDownloadedTrackEntry;
}

function collection(
  id: string,
  trackIds: string[]
): DownloadedCollectionEntry {
  return { id, type: 'album', trackIds, downloadedAt: 0 };
}

function job(
  id: string,
  trackIds: string[],
  extra: Partial<PersistedDownloadJob> = {}
): PersistedDownloadJob {
  return {
    id,
    tracks: trackIds.map(trackId => ({ id: trackId })),
    ...extra,
  } as PersistedDownloadJob;
}

describe('tracksInScope', () => {
  it('covers every track when no scope is given', () => {
    const tracks = [track('a'), track('b', { serverId: 'server-2' })];

    expect(tracksInScope(tracks, undefined)).toHaveLength(2);
  });

  it('covers only the named server', () => {
    const tracks = [track('a'), track('b', { serverId: 'server-2' })];

    expect(tracksInScope(tracks, { serverId: 'server-1' }).map(t => t.trackId)).toEqual(['a']);
  });

  it('covers nothing when the scope resolves to no server at all', () => {
    // A scope was explicitly passed but names nothing identifiable. Matching
    // everything here would silently turn a provider clear into a clear-all.
    const tracks = [track('a'), track('b', { serverId: 'server-2' })];

    expect(tracksInScope(tracks, { serverId: null, serverType: null })).toEqual([]);
  });
});

describe('tracksInCollectionRemoval', () => {
  it('covers only the named tracks', () => {
    const tracks = [track('a'), track('b'), track('c')];

    expect(tracksInCollectionRemoval(tracks, ['a', 'c']).map(t => t.trackId)).toEqual(['a', 'c']);
  });

  it('ignores ids that are not downloaded', () => {
    expect(tracksInCollectionRemoval([track('a')], ['a', 'missing'])).toHaveLength(1);
  });

  it('narrows to the scope when one is given', () => {
    const tracks = [track('a'), track('b', { serverId: 'server-2' })];

    expect(
      tracksInCollectionRemoval(tracks, ['a', 'b'], { serverId: 'server-2' }).map(t => t.trackId)
    ).toEqual(['b']);
  });
});

describe('collectionsWithoutTracks', () => {
  it('trims removed tracks out of a collection it shares', () => {
    const collections = [collection('album-1', ['a', 'b', 'c'])];

    expect(collectionsWithoutTracks(collections, new Set(['b']))[0].trackIds).toEqual(['a', 'c']);
  });

  it('drops a collection left with nothing', () => {
    const collections = [collection('album-1', ['a'])];

    expect(collectionsWithoutTracks(collections, new Set(['a']))).toEqual([]);
  });

  it('leaves collections of other providers intact', () => {
    // The regression this guards: deciding from the scope's resolved serverId
    // dropped every collection from every provider whenever the scope could
    // not resolve one.
    const collections = [collection('album-1', ['a']), collection('album-2', ['z'])];

    const remaining = collectionsWithoutTracks(collections, new Set(['a']));

    expect(remaining.map(item => item.id)).toEqual(['album-2']);
  });

  it('is a no-op when nothing was removed', () => {
    const collections = [collection('album-1', ['a', 'b'])];

    expect(collectionsWithoutTracks(collections, new Set())).toEqual(collections);
  });
});

describe('tracksWithout', () => {
  it('removes exactly the named tracks', () => {
    const tracks = [track('a'), track('b')];

    expect(tracksWithout(tracks, new Set(['a'])).map(t => t.trackId)).toEqual(['b']);
  });
});

describe('job matching', () => {
  it('matches a download id against the job, its collection, or a track', () => {
    const target = job('job-1', ['t1'], { collectionId: 'album-1' });

    expect(jobMatchesDownloadId(target, 'job-1')).toBe(true);
    expect(jobMatchesDownloadId(target, 'album-1')).toBe(true);
    expect(jobMatchesDownloadId(target, 't1')).toBe(true);
    expect(jobMatchesDownloadId(target, 'other')).toBe(false);
  });

  it('matches a collection id against the job or its collection, never a track', () => {
    // Cancelling a collection must not be triggered by a track that happens to
    // share the id.
    const target = job('job-1', ['t1'], { collectionId: 'album-1' });

    expect(jobMatchesCollectionId(target, 'album-1')).toBe(true);
    expect(jobMatchesCollectionId(target, 'job-1')).toBe(true);
    expect(jobMatchesCollectionId(target, 't1')).toBe(false);
  });

  it('collects the track ids of the given jobs', () => {
    expect(trackIdsOfJobs([job('j1', ['a', 'b']), job('j2', ['c'])])).toEqual(['a', 'b', 'c']);
  });
});

describe('jobsOutsideScope', () => {
  it('keeps a job that still has work for another provider', () => {
    const mixed = {
      id: 'job-1',
      tracks: [
        { id: 'a', sourceServerId: 'server-1' },
        { id: 'b', sourceServerId: 'server-2' },
      ],
    } as unknown as PersistedDownloadJob;

    expect(jobsOutsideScope([mixed], { serverId: 'server-1' })).toHaveLength(1);
  });

  it('drops a job entirely inside the cleared scope', () => {
    const scoped = {
      id: 'job-1',
      tracks: [{ id: 'a', sourceServerId: 'server-1' }],
    } as unknown as PersistedDownloadJob;

    expect(jobsOutsideScope([scoped], { serverId: 'server-1' })).toEqual([]);
  });
});

describe('orphanedTrackIds', () => {
  it('cancels a track no remaining job still wants', () => {
    expect(orphanedTrackIds(['a', 'b'], [job('j1', ['b'])])).toEqual(['a']);
  });

  it('leaves a track another job still needs alone', () => {
    // The same track can belong to two collections; removing one must not
    // cancel the download the other still depends on.
    expect(orphanedTrackIds(['a'], [job('j1', ['a'])])).toEqual([]);
  });

  it('cancels everything when the queue is empty', () => {
    expect(orphanedTrackIds(['a', 'b'], [])).toEqual(['a', 'b']);
  });
});
