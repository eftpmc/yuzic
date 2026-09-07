import {
  EQ_FREQUENCIES,
  EQ_PRESETS,
  FLAT_EQ,
  isFlat,
  matchPreset,
  presetToBands,
} from './audioSettings';

describe('equalizer presets', () => {
  /**
   * The presets are written as bare arrays of numbers, so nothing but this
   * stops one drifting out of step with the band list — and a preset one
   * element short would silently zero its top band rather than fail.
   */
  it('every preset has a gain for every band', () => {
    for (const preset of EQ_PRESETS) {
      expect(preset.gains).toHaveLength(EQ_FREQUENCIES.length);
    }
  });

  it('turns a preset into bands in frequency order', () => {
    const bands = presetToBands(EQ_PRESETS[1].gains);
    expect(bands.map(band => band.frequencyHz)).toEqual([...EQ_FREQUENCIES]);
    expect(bands[0].gainDb).toBe(EQ_PRESETS[1].gains[0]);
  });

  it('pads a short gain list with zeroes rather than undefined', () => {
    const bands = presetToBands([3]);
    expect(bands[0].gainDb).toBe(3);
    expect(bands[9].gainDb).toBe(0);
  });
});

describe('matchPreset', () => {
  it('names the preset a curve came from', () => {
    expect(matchPreset(presetToBands(EQ_PRESETS[1].gains))).toBe('bass');
  });

  it('reports flat as a preset, since it is one', () => {
    expect(matchPreset(FLAT_EQ)).toBe('flat');
  });

  /**
   * The reason this function exists: after dragging one slider the screen must
   * stop claiming a preset is selected, or the highlight describes a sound
   * nobody is hearing.
   */
  it('returns null once a band is moved off a preset', () => {
    const bands = presetToBands(EQ_PRESETS[1].gains);
    bands[4] = { ...bands[4], gainDb: 7 };
    expect(matchPreset(bands)).toBeNull();
  });
});

describe('isFlat', () => {
  it('is true only when nothing is boosted or cut', () => {
    expect(isFlat(FLAT_EQ)).toBe(true);
    expect(isFlat(presetToBands(EQ_PRESETS[1].gains))).toBe(false);
  });

  /**
   * A single cut band is not flat. Checked because the engine bypasses the EQ
   * unit on flat, and bypassing a curve someone has set would silently discard
   * their setting.
   */
  it('is false for a curve that only cuts', () => {
    const bands = presetToBands([0, 0, 0, 0, -3, 0, 0, 0, 0, 0]);
    expect(isFlat(bands)).toBe(false);
  });
});
