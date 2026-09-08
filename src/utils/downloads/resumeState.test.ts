import {
  RESUMABLE_TTL_MS,
  expiredResumables,
  findUsableResumable,
  removeResumable,
  stagingPathsToKeep,
  upsertResumable,
} from './resumeState';
import type { PersistedResumable } from './localDownloadStore';

const NOW = 1_700_000_000_000;

function entry(overrides: Partial<PersistedResumable> = {}): PersistedResumable {
  return {
    trackId: 't1',
    url: 'https://server/stream?id=t1&token=abc',
    fileUri: 'file:///downloads/t1.part',
    resumeData: 'resume-token',
    savedAt: NOW,
    ...overrides,
  };
}

describe('upsertResumable', () => {
  it('replaces the entry for a track rather than adding a second', () => {
    const list = [entry({ resumeData: 'old' })];
    const next = upsertResumable(list, entry({ resumeData: 'new' }));

    expect(next).toHaveLength(1);
    expect(next[0].resumeData).toBe('new');
  });

  it('leaves other tracks alone', () => {
    const list = [entry({ trackId: 'other' })];
    expect(upsertResumable(list, entry())).toHaveLength(2);
  });
});

describe('removeResumable', () => {
  it('drops only the named track', () => {
    const list = [entry(), entry({ trackId: 'other' })];
    expect(removeResumable(list, 't1').map(item => item.trackId)).toEqual(['other']);
  });
});

describe('findUsableResumable', () => {
  it('returns the entry when the URL still matches', () => {
    const list = [entry()];
    expect(findUsableResumable(list, 't1', entry().url, NOW)).not.toBeNull();
  });

  it('is null for a track with nothing saved', () => {
    expect(findUsableResumable([], 't1', entry().url, NOW)).toBeNull();
  });

  /**
   * The one that matters. A stream URL carries an auth token and a quality
   * choice; resuming against a different one appends bytes from a second
   * response onto the first, and the file is the right length and silent in
   * the middle.
   */
  it('refuses to resume against a different URL', () => {
    const list = [entry()];
    const rotated = 'https://server/stream?id=t1&token=xyz';

    expect(findUsableResumable(list, 't1', rotated, NOW)).toBeNull();
  });

  it('is null without resume data, since there is nothing to resume from', () => {
    expect(findUsableResumable([entry({ resumeData: undefined })], 't1', entry().url, NOW))
      .toBeNull();
  });

  it('is null once the saved state is older than its TTL', () => {
    const list = [entry()];
    expect(findUsableResumable(list, 't1', entry().url, NOW + RESUMABLE_TTL_MS + 1)).toBeNull();
  });
});

describe('expiredResumables', () => {
  it('names only what has aged out', () => {
    const list = [entry({ trackId: 'fresh' }), entry({ trackId: 'stale', savedAt: 0 })];
    expect(expiredResumables(list, NOW).map(item => item.trackId)).toEqual(['stale']);
  });
});

describe('stagingPathsToKeep', () => {
  it('keeps the file of a resumable download', () => {
    expect(stagingPathsToKeep([entry()], NOW)).toEqual(new Set([entry().fileUri]));
  });

  it('does not keep a file there is no resume data for', () => {
    expect(stagingPathsToKeep([entry({ resumeData: undefined })], NOW).size).toBe(0);
  });

  it('does not keep a file whose state has aged out', () => {
    expect(stagingPathsToKeep([entry()], NOW + RESUMABLE_TTL_MS + 1).size).toBe(0);
  });
});
