import {
  settleFromBar,
  settleFromPlayer,
  OPEN_AT,
  OPEN_VELOCITY,
  CLOSE_BELOW,
  CLOSE_VELOCITY,
} from './settle';

describe('settleFromBar', () => {
  it('opens when the drag passes the threshold', () => {
    expect(settleFromBar(OPEN_AT + 0.01, 0, true)).toBe(1);
  });

  it('falls back to the dock when it does not', () => {
    expect(settleFromBar(OPEN_AT - 0.01, 0, true)).toBe(0);
  });

  it('takes a fast upward flick that never travelled far', () => {
    expect(settleFromBar(0.05, OPEN_VELOCITY - 1, true)).toBe(1);
  });

  it('ignores a downward flick, which is not an open', () => {
    expect(settleFromBar(0.05, 2000, true)).toBe(0);
  });
});

describe('settleFromPlayer', () => {
  it('stays open when barely pulled down', () => {
    expect(settleFromPlayer(CLOSE_BELOW + 0.01, 0, true)).toBe(1);
  });

  it('closes once pulled past the threshold', () => {
    expect(settleFromPlayer(CLOSE_BELOW - 0.01, 0, true)).toBe(0);
  });

  it('takes a decisive throw downward from near the top', () => {
    expect(settleFromPlayer(0.99, CLOSE_VELOCITY + 1, true)).toBe(0);
  });

  it('ignores an upward flick, which cannot close', () => {
    expect(settleFromPlayer(0.99, -2000, true)).toBe(1);
  });
});

describe('a gesture that decided nothing', () => {
  // The bug (#211): the close gesture returned early without settling when the
  // player was fully open, so an interrupted pan left `expansion` wherever it
  // stood — and the playing bar, which fades itself out by `expansion`, drew
  // fully transparent while still mounted and still counted as open.
  it('still names an end rather than leaving the value parked', () => {
    expect(settleFromPlayer(1, 0, false)).toBe(1);
    expect(settleFromPlayer(0.3, 0, false)).toBe(0);
    expect(settleFromBar(0, 0, false)).toBe(0);
  });

  it('sends a stuck intermediate to the nearest end, never to itself', () => {
    // Every value a finger can hold resolves to 0 or 1, so no exit can leave
    // the bar invisible.
    for (const e of [0, 0.001, 0.2, 0.3, 0.49, 0.5, 0.7, 0.9, 1]) {
      expect([0, 1]).toContain(settleFromPlayer(e, 0, false));
      expect([0, 1]).toContain(settleFromBar(e, 0, false));
    }
  });
});

describe('every outcome is an end', () => {
  it('never returns an intermediate, whatever it is given', () => {
    const values = [0, 0.15, 0.3, 0.5, 0.74, 0.75, 0.99, 1];
    const velocities = [-2000, -700, -100, 0, 100, 700, 2000];
    for (const e of values) {
      for (const v of velocities) {
        for (const moved of [true, false]) {
          expect([0, 1]).toContain(settleFromBar(e, v, moved));
          expect([0, 1]).toContain(settleFromPlayer(e, v, moved));
        }
      }
    }
  });
});
