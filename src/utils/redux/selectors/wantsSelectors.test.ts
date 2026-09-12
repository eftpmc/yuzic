import type { RootState } from '@/utils/redux/store';
import type { LocalId } from '@/types/EntityId';
import type { Want } from '@/utils/redux/slices/wantsSlice';
import {
  selectWantsForActiveServer,
  selectIsWanted,
  selectWantCountForActiveServer,
} from './wantsSelectors';

function stateWith(byServer: Record<string, Want[]>, activeServerId: string | null): RootState {
  return {
    wants: { byServer },
    servers: { activeServerId },
  } as unknown as RootState;
}

const want = (localId: string, title = 'Idioteque'): Want => ({
  localId: localId as LocalId,
  unit: 'track',
  title,
  artist: 'Radiohead',
  origin: 'search',
  createdAt: 1,
  updatedAt: 1,
});

describe('wantsSelectors', () => {
  it('returns an empty array when there is no active server', () => {
    const state = stateWith({ s1: [want('w1')] }, null);
    expect(selectWantsForActiveServer(state)).toEqual([]);
  });

  it('returns an empty array when the active server has no wants yet', () => {
    const state = stateWith({}, 's1');
    expect(selectWantsForActiveServer(state)).toEqual([]);
  });

  it('returns the wants scoped to the active server only', () => {
    const state = stateWith({ s1: [want('w1')], s2: [want('w2')] }, 's1');
    expect(selectWantsForActiveServer(state)).toEqual([want('w1')]);
  });

  it('selectIsWanted reports true only for a localId present on the active server', () => {
    const state = stateWith({ s1: [want('w1')], s2: [want('w2')] }, 's1');
    expect(selectIsWanted('w1' as LocalId)(state)).toBe(true);
    expect(selectIsWanted('w2' as LocalId)(state)).toBe(false);
    expect(selectIsWanted('missing' as LocalId)(state)).toBe(false);
  });

  it('selectWantCountForActiveServer counts only the active server', () => {
    const state = stateWith({ s1: [want('w1'), want('w2')], s2: [want('w3')] }, 's1');
    expect(selectWantCountForActiveServer(state)).toBe(2);
  });

  it('selectWantCountForActiveServer is 0 with no active server', () => {
    const state = stateWith({ s1: [want('w1')] }, null);
    expect(selectWantCountForActiveServer(state)).toBe(0);
  });
});
