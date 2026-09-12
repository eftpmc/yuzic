import { makeLocalId } from '../EntityId';

describe('makeLocalId', () => {
  it('is idempotent for the same server-originated input', () => {
    const a = makeLocalId({ kind: 'album', sourceServerId: 'srv-1', serverItemId: 'item-1' });
    const b = makeLocalId({ kind: 'album', sourceServerId: 'srv-1', serverItemId: 'item-1' });
    expect(a).toBe(b);
  });

  it('produces a different id for a different sourceServerId', () => {
    const a = makeLocalId({ kind: 'album', sourceServerId: 'srv-1', serverItemId: 'item-1' });
    const b = makeLocalId({ kind: 'album', sourceServerId: 'srv-2', serverItemId: 'item-1' });
    expect(a).not.toBe(b);
  });

  it('produces a different id for a different kind (server-originated)', () => {
    const a = makeLocalId({ kind: 'album', sourceServerId: 'srv-1', serverItemId: 'item-1' });
    const b = makeLocalId({ kind: 'track', sourceServerId: 'srv-1', serverItemId: 'item-1' });
    expect(a).not.toBe(b);
  });

  it('is idempotent for the same external-originated input', () => {
    const a = makeLocalId({ kind: 'album', externalSource: 'deezer', externalNativeId: 'ext-1' });
    const b = makeLocalId({ kind: 'album', externalSource: 'deezer', externalNativeId: 'ext-1' });
    expect(a).toBe(b);
  });

  it('produces a different id for a different externalSource', () => {
    const a = makeLocalId({ kind: 'album', externalSource: 'deezer', externalNativeId: 'ext-1' });
    const b = makeLocalId({ kind: 'album', externalSource: 'musicbrainz', externalNativeId: 'ext-1' });
    expect(a).not.toBe(b);
  });

  it('produces a different id for a different kind (external-originated)', () => {
    const a = makeLocalId({ kind: 'album', externalSource: 'deezer', externalNativeId: 'ext-1' });
    const b = makeLocalId({ kind: 'track', externalSource: 'deezer', externalNativeId: 'ext-1' });
    expect(a).not.toBe(b);
  });

  it('gives a server-originated and an external-originated record for the same conceptual album different ids', () => {
    // Identity is not matching: even if these two records describe the same
    // real-world album, their LocalIds differ because they come from
    // different origins with unrelated native ids.
    const serverSide = makeLocalId({ kind: 'album', sourceServerId: 'srv-1', serverItemId: 'abc123' });
    const externalSide = makeLocalId({ kind: 'album', externalSource: 'deezer', externalNativeId: 'abc123' });
    expect(serverSide).not.toBe(externalSide);
  });
});
