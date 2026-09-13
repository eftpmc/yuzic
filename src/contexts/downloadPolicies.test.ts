import { collectionDownloadState, downloadProgressFraction, nextDownloadingIds } from './downloadPolicies';

describe('download policies', () => {
  it('reports bounded progress and unknown length as -1', () => {
    expect(downloadProgressFraction(25, 100)).toBe(0.25);
    expect(downloadProgressFraction(150, 100)).toBe(1);
    expect(downloadProgressFraction(25, 0)).toBe(-1);
  });

  it('adds and removes a track from the downloading set immutably', () => {
    const initial = new Set(['a']);
    expect(nextDownloadingIds(initial, 'b', true)).toEqual(new Set(['a', 'b']));
    expect(nextDownloadingIds(initial, 'a', false)).toEqual(new Set());
    expect(initial).toEqual(new Set(['a']));
  });

  it('derives collection download state from downloaded, active, and queued ids', () => {
    expect(collectionDownloadState([], new Set(), new Set(), new Set())).toEqual({ isDownloaded: false, isDownloading: false });
    expect(collectionDownloadState(['a', 'b'], new Set(['a', 'b']), new Set(), new Set())).toEqual({ isDownloaded: true, isDownloading: false });
    expect(collectionDownloadState(['a', 'b'], new Set(['a']), new Set(['b']), new Set())).toEqual({ isDownloaded: false, isDownloading: true });
    expect(collectionDownloadState(['a', 'b'], new Set(), new Set(), new Set(['b']))).toEqual({ isDownloaded: false, isDownloading: true });
  });
});
