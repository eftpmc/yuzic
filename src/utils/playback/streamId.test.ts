import { streamSourceId } from './streamId';

describe('streamSourceId', () => {
  it('uses a provider playable-resource id when it differs from the catalog id', () => {
    expect(streamSourceId({ id: 'rating-key', streamId: '/library/parts/44' })).toBe('/library/parts/44');
  });

  it('uses the catalog id for providers whose stream resource is the item itself', () => {
    expect(streamSourceId({ id: 'song-id' })).toBe('song-id');
  });
});
