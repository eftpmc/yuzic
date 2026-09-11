import {
  canStartCoverSlide,
  coverSlideOffset,
  enterCoverSlideWhenTrackChanges,
  type CoverSlide,
} from './coverTransition';

describe('enterCoverSlideWhenTrackChanges', () => {
  const exiting: CoverSlide = {
    direction: 'next',
    phase: 'exiting',
    outgoingSongId: 'current',
  };

  it('keeps the outgoing cover in control until the player actually changes track', () => {
    expect(enterCoverSlideWhenTrackChanges(exiting, 'current')).toBe(exiting);
  });

  it('starts the replacement cover offscreen only after the new track arrives', () => {
    expect(enterCoverSlideWhenTrackChanges(exiting, 'next')).toEqual({
      ...exiting,
      phase: 'entering',
    });
  });
});

describe('coverSlideOffset', () => {
  const width = 300;

  it('moves an outgoing next cover left while the replacement enters from the right', () => {
    expect(coverSlideOffset('next', 'exiting', width)).toBe(-width);
    expect(coverSlideOffset('next', 'entering', width)).toBe(width);
  });

  it('mirrors the transition for previous', () => {
    expect(coverSlideOffset('previous', 'exiting', width)).toBe(width);
    expect(coverSlideOffset('previous', 'entering', width)).toBe(-width);
  });
});

describe('canStartCoverSlide', () => {
  it('does not strand the outgoing cover when the queue cannot advance', () => {
    expect(canStartCoverSlide('next', 2, 3, 'off')).toBe(false);
    expect(canStartCoverSlide('previous', 0, 3, 'off')).toBe(false);
  });

  it('allows an intentional queue move, including repeat-all from the end', () => {
    expect(canStartCoverSlide('next', 1, 3, 'off')).toBe(true);
    expect(canStartCoverSlide('previous', 1, 3, 'off')).toBe(true);
    expect(canStartCoverSlide('next', 2, 3, 'all')).toBe(true);
  });
});
