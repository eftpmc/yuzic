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
   * Bottom breathing room for scrolling lists. Used to be 180 when the tab
   * bar + playing bar were a floating overlay screens had to reserve room
   * for — now that the tab bar is a real docked react-navigation tabBar,
   * screens naturally end at its top edge and this is just visual padding.
   */
  scrollClearance: 24,
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
  warning: '#FF9500',
  /** Softer amber for inline warning text (e.g. onboarding hints, form warnings)
   *  that would look shouty in the pure iOS orange. */
  warningText: '#f59e0b',
  downloading: '#007AFF',
} as const;

/**
 * External service brand colours. One source of truth so a badge on Home,
 * a chip on the artist page, and the source-registry entry all read the
 * same purple/red — instead of drifting to `#A238CA` in six files and
 * `#a238ca` in a seventh.
 */
export const sourceColor = {
  deezer: '#A238CA',
  lastfm: '#D51007',
  listenbrainz: '#EB743B',
  musicbrainz: '#BA478F',
} as const;

/**
 * Colours for surfaces that are always dark regardless of the app's theme —
 * the full-screen player, the playing bar, the onboarding flow. They can't
 * read from `useTheme()` because they need to look right for a light-theme
 * user too. Pre-radius/typography rules apply: pick by role, not by hex.
 *
 * Every value here was drift before — `#111` vs `#1a1a1a` vs `#121212` for
 * "one shade above black", `#888` vs `#aaa` for "subtext on dark". Twelve
 * distinct greys folded onto seven roles.
 */
export const onDark = {
  /** Base page background — the darkest surface. */
  background: '#000',
  /** Card / raised surface a step above the background. */
  surface: '#111',
  /** A slightly-lighter card, mostly used for player inner cards. */
  surfaceElevated: '#1a1a1a',
  /** A step further — chips, badges, muted rows on dark. */
  muted: '#222',
  /** Divider / soft border. */
  border: '#333',
  /** Primary foreground text. */
  text: '#fff',
  /** Secondary foreground (subtitle, timestamps, meta). */
  subtext: '#aaa',
  /** Tertiary foreground (very faded meta, disabled). */
  mutedText: '#888',
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
 *
 * These are the **default** values, always static. The structural nudges
 * (`xs`/`sm`) are left this way on purpose — they round the corner of a
 * progress fill or a pressed row highlight, which is not shape the user is
 * choosing when they pick a preset.
 *
 * User-facing shape (album covers, row artwork, playing bar, player controls,
 * library tiles, buttons) reads its corners from {@link useRadius} instead,
 * which scales the same base numbers by whichever preset the user picked. This
 * is what {@link RadiusPreset} controls — it never reaches back to change these
 * defaults, so anything unmigrated stays at "default" regardless of preset.
 */
export type RadiusPreset = 'sharp' | 'default' | 'rounded';

export const radius = {
  /** Square by intent — a rule that spans the full width of a surface, where
   * rounded ends would read as a detached bar rather than an edge. */
  none: 0,
  xs: 4,
  sm: 6,
  /** Artwork in a row — the thumbnail beside a track, a playlist, a search
   * result. The single most repeated shape in the app, so it scales with the
   * preset (via {@link useRadius}) rather than holding still while the cards
   * around it move. */
  thumb: 6,
  md: 8,
  card: 12,
  lg: 16,
  /** The now-playing screen's cards, which are large enough that a card radius
   * reads as a sharp corner on them. */
  panel: 24,
  pill: 999,
} as const;

/** Multiplier applied to each base radius by preset. `pill` (>= 100) is
 *  special-cased in {@link scaleRadius}: it always stays a pill, since a
 *  circular button reads as a bug when it squares up under `sharp`. `sharp`
 *  is a softly-rounded square rather than a razor corner — the razor version
 *  had no real use, and cards under it looked broken. */
export const RADIUS_MULTIPLIER: Record<RadiusPreset, number> = {
  sharp: 0.35,
  default: 1,
  rounded: 1.75,
};

/** Scales one base value by preset. Pill (>= 100) stays pill under every
 *  preset — a circular play button should not become a square, and a pill
 *  scaled 1.75x is still a pill. A base radius under `sharp` rounds up to at
 *  least 1 so a corner never lands flat when the intent was "softly square". */
export function scaleRadius(base: number, preset: RadiusPreset): number {
  if (base >= 100) return base;
  const m = RADIUS_MULTIPLIER[preset];
  const scaled = Math.round(base * m);
  return preset === 'sharp' ? Math.max(scaled, 1) : scaled;
}

/**
 * The type scale: 14 roles, each chosen by naming what the text is so the same
 * decision comes out the same way twice. Literal `fontSize` was up to thirteen
 * distinct values across the app, including 13, 14 and 15 all doing the job of
 * "small"; and the scale itself had drift too (a `detailTitle` byte-for-byte
 * identical to `screenTitle`, and a `compactRowSubtitle` identical to `caption`,
 * both since collapsed).
 *
 * Weight ladder is 400 / 500 / 600 — hero and display sit at 600 so the whole
 * app has one bold weight instead of a lonely 700 at the top.
 *
 * Adding a role is fine. Adding one that differs from an existing role only in
 * size is how the drift starts again.
 */
export const typography = {
  hero: { fontSize: 48, lineHeight: 52, fontWeight: '600' as const },
  display: { fontSize: 28, lineHeight: 34, fontWeight: '600' as const },
  screenTitle: { fontSize: 24, lineHeight: 30, fontWeight: '600' as const },
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

/**
 * The vertical rhythm of a list row — how much air it has above and below.
 *
 * This is the user's choice rather than a per-screen one, which is why it
 * replaced the old fixed `rowDensity` scale: that had three densities a screen
 * picked from and two of the three were never picked. The three roles here are
 * the three shapes a row actually comes in, and each moves one step of the
 * spacing scale per density, so the whole app loosens or tightens together
 * instead of one list changing while the next holds still.
 *
 * Only the rhythm moves. Artwork and type stay the size they are at every
 * density — a "compact" list that also shrank the covers would be a different
 * design rather than a denser one.
 *
 * The `default` column is what every list rendered before the setting existed,
 * so an untouched install does not move.
 */
export type ListDensity = 'compact' | 'default' | 'spacious';

export const listDensity: Record<
  ListDensity,
  {
    /** Gap below a row that stands on its own — an album, artist or playlist. */
    rowGap: number;
    /** Padding inside a compact row, which sits flush against the next one. */
    rowPadding: number;
    /** Padding inside a track row, which is compact but carries a whole
     *  record's worth of them and needs the extra step. */
    trackRowPadding: number;
  }
> = {
  compact: { rowGap: spacing.sm, rowPadding: spacing.xs, trackRowPadding: spacing.sm },
  default: { rowGap: spacing.lg, rowPadding: spacing.sm, trackRowPadding: spacing.md },
  spacious: { rowGap: spacing.xl, rowPadding: spacing.md, trackRowPadding: spacing.roomy },
};

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
  /** Alias for `destructive`. Kept for callers that read `error`. */
  error: string;
  /** Destructive action color — dark-mode aware (`#FF453A` dark / `#FF3B30` light). */
  destructive: string;
  /** Background surface for a destructive info card. */
  destructiveSurface: string;
  /** Border on a destructive info card. */
  destructiveBorder: string;
  /** Text color on a destructive info card. */
  destructiveOnSurface: string;
  /** Warning-toned foreground for inline text like unsaved-changes hints. */
  warningText: string;
};
