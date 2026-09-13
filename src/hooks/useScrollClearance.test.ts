import { resolveBottomOverlayHeight } from './useScrollClearance';

describe('resolveBottomOverlayHeight', () => {
  it('returns the full dock height when a translucent dock overlays the screen', () => {
    expect(resolveBottomOverlayHeight(true, 144)).toBe(144);
  });

  it('returns zero when the dock participates in layout', () => {
    expect(resolveBottomOverlayHeight(false, 144)).toBe(0);
  });

  it('returns zero outside the tab navigator', () => {
    expect(resolveBottomOverlayHeight(true, null)).toBe(0);
  });
});
