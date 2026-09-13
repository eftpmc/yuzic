import {
  backendRepeatMode,
  clampVolume,
  nextRepeatMode,
  seekTarget,
  movedCurrentIndex,
} from './playingPolicies';

describe('playing policies', () => {
  it.each([
    ['off', 'all'],
    ['all', 'one'],
    ['one', 'off'],
  ] as const)('cycles repeat %s to %s', (current, expected) => {
    expect(nextRepeatMode(current)).toBe(expected);
  });

  it.each([
    ['off', 'off'],
    ['all', 'queue'],
    ['one', 'track'],
  ] as const)('maps repeat %s to backend mode %s', (mode, expected) => {
    expect(backendRepeatMode(mode)).toBe(expected);
  });

  it('clamps volume to the player range', () => {
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume(0.4)).toBe(0.4);
    expect(clampVolume(2)).toBe(1);
  });

  it('clamps seek targets at zero and duration', () => {
    expect(seekTarget(2, -10, 30)).toBe(0);
    expect(seekTarget(2, 5, 30)).toBe(7);
    expect(seekTarget(29, 5, 30)).toBe(30);
    expect(seekTarget(2, 5, 0)).toBe(7);
  });

  it('keeps the current index aligned when a queue item moves', () => {
    expect(movedCurrentIndex(2, 2, 0)).toBe(0);
    expect(movedCurrentIndex(2, 0, 3)).toBe(1);
    expect(movedCurrentIndex(2, 3, 0)).toBe(3);
    expect(movedCurrentIndex(2, 1, 3)).toBe(1);
  });
});
