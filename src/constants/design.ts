/**
 * The spacing scale.
 *
 * Named roles first, then the raw steps. Literal paddings ran to thirty
 * distinct values; the ones here are the ones real layouts actually wanted,
 * with the near-misses (13, 14, 18, 22, 30 and friends) folded onto the step
 * beside them.
 */
export const spacing = {
  page: 16,
  section: 24,
  rowGap: 12,
  controlGap: 10,
  inlineGap: 8,
  /**
   * Bottom padding for any scrolling list, so its last row clears the playing
   * bar and the tab bar. Lists used 100, 120, 140 and 180 for this — the short
   * ones hid their last row behind the player, which is a bug rather than a
   * style, so there is one number now.
   */
  scrollClearance: 180,
  xxs: 2,
  xs: 4,
  tight: 6,
  sm: 8,
  md: 12,
  lg: 16,
  roomy: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  /** Empty states and sheet bodies, where the gap is the point. */
  generous: 48,
  /** The two detail-header skeletons, clearing a nav bar that overlays them. */
  headerOffset: 60,
} as const;

export const statusColor = {
  favorite: '#ff3b30',
  destructive: '#ff3b30',
  success: '#34C759',
  downloading: '#007AFF',
} as const;

/**
 * Pressed-state overlay opacity.
 *
 * One value for the whole app: the codebase had seven different `activeOpacity`
 * settings, which is seven answers to a question nobody was asking. Android
 * spends it on a ripple bounded to the component, iOS on a dip in opacity.
 */
export const stateLayer = {
  rippleDark: 'rgba(255, 255, 255, 0.12)',
  rippleLight: 'rgba(0, 0, 0, 0.10)',
  pressedOpacity: 0.6,
} as const;

/**
 * The shape scale. Same rule as the type scale: pick by what the thing is.
 *
 * Literal `borderRadius` ran to twelve distinct values — 2, 4, 5, 6, 8, 10, 11,
 * 12, 14, 16, 24, 60 — which is one per developer-day rather than a decision.
 */
export const radius = {
  xs: 4,
  sm: 6,
  thumb: 6,
  md: 8,
  card: 12,
  lg: 16,
  /** The now-playing screen's cards, which are large enough that a card radius
   * reads as a sharp corner on them. */
  panel: 24,
  pill: 999,
} as const;

/**
 * The type scale: nine sizes, each with a role that says where it goes.
 *
 * The point is not that nine is few — Apple's own scale is about this size —
 * but that a size is chosen by naming what the text is, so the same decision
 * comes out the same way twice. Literal `fontSize` was up to thirteen distinct
 * values across the app, including 13, 14 and 15 all doing the job of "small",
 * which is the drift that reads as unfinished even when each screen is fine.
 *
 * Adding a role is fine. Adding one that differs from an existing role only in
 * size is how the drift starts again.
 */
export const typography = {
  hero: { fontSize: 48, lineHeight: 52, fontWeight: '600' as const },
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  screenTitle: { fontSize: 24, lineHeight: 30, fontWeight: '600' as const },
  detailTitle: { fontSize: 24, lineHeight: 30, fontWeight: '600' as const },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const },
  navigationTitle: { fontSize: 18, lineHeight: 22, fontWeight: '600' as const },
  sheetTitle: { fontSize: 16, lineHeight: 20, fontWeight: '600' as const },
  rowTitle: { fontSize: 16, lineHeight: 20, fontWeight: '500' as const },
  body: { fontSize: 16, lineHeight: 21 },
  button: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const },
  compactRowTitle: { fontSize: 15, lineHeight: 19, fontWeight: '500' as const },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '600' as const },
  rowSubtitle: { fontSize: 14, lineHeight: 18 },
  caption: { fontSize: 13, lineHeight: 17 },
  compactRowSubtitle: { fontSize: 13, lineHeight: 17 },
  micro: { fontSize: 11, lineHeight: 14 },
} as const;

export const controlSize = {
  /**
   * The smallest a tap target may be, in points.
   *
   * Apple's minimum; Material asks for 48. A control is allowed to *look*
   * smaller than this — a 34pt toggle next to a 34pt pill is the right drawing
   * — but what the finger has to hit never is. Use `hitSlopFor` to make up the
   * difference rather than growing the control.
   */
  minimumTarget: 44,
  iconDefault: 44,
  iconCompact: 36,
  detailSecondary: 40,
  detailPrimaryWidth: 112,
  detailPrimaryHeight: 48,
  mediaRowArt: 64,
  compactMediaRowArt: 44,
  topBarHeight: 52,
} as const;

export const rowDensity = {
  compact: { paddingVertical: 8, marginBottom: 0 },
  standard: { paddingVertical: 10, marginBottom: 16 },
  spacious: { paddingVertical: 13, marginBottom: 16 },
} as const;

export type SemanticThemeColors = {
  themeColor: string;
  background: string;
  card: string;
  text: string;
  secondary: string;
  subtext: string;
  border: string;
  muted: string;
  placeholder: string;
  overlay: string;
  statusSurface: string;
  onThemeColor: string;
  success: string;
  warning: string;
  error: string;
  sourceDeezer: string;
  sourceLastfm: string;
};


/**
 * The padding a control of this size needs to reach the minimum tap target.
 *
 * Returns undefined when it already does, so it can be spread onto a component
 * unconditionally without adding a slop of zero.
 */
export function hitSlopFor(size: number) {
  const missing = controlSize.minimumTarget - size;
  if (missing <= 0) return undefined;
  const pad = Math.ceil(missing / 2);
  return { top: pad, bottom: pad, left: pad, right: pad };
}
