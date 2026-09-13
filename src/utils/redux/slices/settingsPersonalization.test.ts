import reducer, { setHomeShelfVisibility, setHomeShelfLength, setSleepTimerPresets } from './settingsSlice';
import { selectHomeShelfItemCount, selectHomeShelfVisibilityMap, selectSleepTimerPresets } from '../selectors/settingsSelectors';

const state = (settings: unknown) => ({ settings } as any);

describe('home and sleep settings', () => {
  it('persists shelf visibility and bounded length through reducers/selectors', () => {
    let next = reducer(undefined, setHomeShelfVisibility({ key: 'charts', visible: false }));
    next = reducer(next, setHomeShelfLength('generous'));
    expect(selectHomeShelfVisibilityMap(state(next))).toEqual({ charts: false });
    expect(selectHomeShelfItemCount(state(next))).toBe(14);
  });

  it('falls back for settings blobs written before the new keys', () => {
    const old = state({});
    expect(selectHomeShelfItemCount(old)).toBe(10);
    expect(selectSleepTimerPresets(old)).toEqual([5, 15, 30]);
  });

  it('keeps configured sleep presets persisted', () => {
    const next = reducer(undefined, setSleepTimerPresets([10, 45]));
    expect(selectSleepTimerPresets(state(next))).toEqual([10, 45]);
  });
});
