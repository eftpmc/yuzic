import { resolveLibraryState } from '../resolveLibraryState';

describe('resolveLibraryState', () => {
  it('resolves in-library when isInLibrary is true, regardless of other facts', () => {
    expect(
      resolveLibraryState({
        isInLibrary: true,
        isWanted: true,
        hasAcquisitionProvider: true,
        isExternalOrigin: true,
      })
    ).toBe('in-library');
  });

  it('in-library wins even with no other facts set', () => {
    expect(resolveLibraryState({ isInLibrary: true })).toBe('in-library');
  });

  it('resolves wanted when not in library but wanted, over acquirable and external', () => {
    expect(
      resolveLibraryState({
        isInLibrary: false,
        isWanted: true,
        hasAcquisitionProvider: true,
        isExternalOrigin: true,
      })
    ).toBe('wanted');
  });

  it('resolves wanted even without an acquisition provider or external origin', () => {
    expect(
      resolveLibraryState({
        isInLibrary: false,
        isWanted: true,
      })
    ).toBe('wanted');
  });

  it('resolves acquirable when not owned, not wanted, but a provider is available', () => {
    expect(
      resolveLibraryState({
        isInLibrary: false,
        isWanted: false,
        hasAcquisitionProvider: true,
        isExternalOrigin: true,
      })
    ).toBe('acquirable');
  });

  it('resolves acquirable even without external origin, as long as a provider exists', () => {
    expect(
      resolveLibraryState({
        isInLibrary: false,
        hasAcquisitionProvider: true,
      })
    ).toBe('acquirable');
  });

  it('resolves external when external-origin and no acquisition provider', () => {
    expect(
      resolveLibraryState({
        isInLibrary: false,
        isWanted: false,
        hasAcquisitionProvider: false,
        isExternalOrigin: true,
      })
    ).toBe('external');
  });

  it('falls through to external when nothing else applies (documented default)', () => {
    expect(resolveLibraryState({ isInLibrary: false })).toBe('external');
  });

  it('treats undefined optional facts the same as false', () => {
    expect(
      resolveLibraryState({
        isInLibrary: false,
        isWanted: undefined,
        hasAcquisitionProvider: undefined,
        isExternalOrigin: undefined,
      })
    ).toBe('external');
  });
});
