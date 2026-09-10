import { resolveCoverSwipe, SWIPE_DISTANCE_RATIO, SWIPE_VELOCITY } from './coverSwipe';

const COVER = 300;
const past = COVER * SWIPE_DISTANCE_RATIO + 1;
const short = COVER * SWIPE_DISTANCE_RATIO - 1;

describe('resolveCoverSwipe', () => {
  it('skips forward when the cover is dragged left, the way the queue moves', () => {
    expect(resolveCoverSwipe(-past, 0, COVER)).toBe('next');
  });

  it('goes back when it is dragged right', () => {
    expect(resolveCoverSwipe(past, 0, COVER)).toBe('previous');
  });

  it('lets a short slow drag fall back', () => {
    expect(resolveCoverSwipe(-short, 0, COVER)).toBe('cancel');
    expect(resolveCoverSwipe(short, 0, COVER)).toBe('cancel');
  });

  it('takes a fast flick that never travelled far', () => {
    expect(resolveCoverSwipe(-40, -SWIPE_VELOCITY - 1, COVER)).toBe('next');
    expect(resolveCoverSwipe(40, SWIPE_VELOCITY + 1, COVER)).toBe('previous');
  });

  it('ignores a fast flick that went nowhere at all', () => {
    // A tap that slipped a pixel can carry real velocity. Without the distance
    // floor this is how a stray touch becomes a skipped track.
    expect(resolveCoverSwipe(-2, -5000, COVER)).toBe('cancel');
  });

  it('reads direction from the drag, not the velocity', () => {
    // Dragged well left, then pulled back at the last moment: velocity points
    // right while the finger's net travel — the thing the user watched the
    // cover do — is still left.
    expect(resolveCoverSwipe(-past, SWIPE_VELOCITY * 2, COVER)).toBe('next');
  });

  it('scales its threshold with the cover, so a tablet is not twitchier', () => {
    const wide = 900;
    expect(resolveCoverSwipe(-past, 0, wide)).toBe('cancel');
    expect(resolveCoverSwipe(-(wide * SWIPE_DISTANCE_RATIO + 1), 0, wide)).toBe('next');
  });
});
