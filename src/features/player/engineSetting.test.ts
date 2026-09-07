import settingsReducer, { setUseYuzicEngine } from '@/utils/redux/slices/settingsSlice';
import { selectUseYuzicEngine } from '@/utils/redux/selectors/settingsSelectors';
import type { RootState } from '@/utils/redux/store';

/**
 * The persisted engine setting.
 *
 * Covered here rather than through the UI because the switch itself could not
 * be driven from the simulator harness — synthetic taps did not move it, and
 * did not move the long-standing Volume Slider toggle beside it either, so the
 * limitation is the harness rather than the row. What *can* be checked without
 * a finger is the part that decides which player runs: the reducer, and the
 * default an upgrading user lands on.
 */
describe('the yuzic-engine setting', () => {
  const stateWith = (settings: Record<string, unknown>) =>
    ({ settings } as unknown as RootState);

  it('is off before anyone chooses', () => {
    const initial = settingsReducer(undefined, { type: '@@INIT' });
    expect(initial.useYuzicEngine).toBe(false);
  });

  it('turns on and off again', () => {
    let state = settingsReducer(undefined, setUseYuzicEngine(true));
    expect(state.useYuzicEngine).toBe(true);
    state = settingsReducer(state, setUseYuzicEngine(false));
    expect(state.useYuzicEngine).toBe(false);
  });

  it('reads false for someone upgrading with nothing stored', () => {
    // The `??` in the selector is what makes this safe: a persisted settings
    // blob written before this key existed rehydrates without it, and the
    // right answer for that user is the player that has shipped — not the one
    // that has never been on a phone.
    expect(selectUseYuzicEngine(stateWith({}))).toBe(false);
    expect(selectUseYuzicEngine(stateWith({ useYuzicEngine: undefined }))).toBe(false);
  });

  it('reads what was stored once someone has chosen', () => {
    expect(selectUseYuzicEngine(stateWith({ useYuzicEngine: true }))).toBe(true);
    expect(selectUseYuzicEngine(stateWith({ useYuzicEngine: false }))).toBe(false);
  });
});
