export const spacing = {
  page: 16,
  section: 24,
  rowGap: 12,
  controlGap: 10,
  inlineGap: 8,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const statusColor = {
  favorite: '#ff3b30',
  destructive: '#ff3b30',
  success: '#34C759',
  downloading: '#007AFF',
} as const;

export const radius = {
  xs: 4,
  sm: 6,
  thumb: 6,
  md: 8,
  card: 12,
  lg: 16,
  pill: 999,
} as const;

export const typography = {
  screenTitle: { fontSize: 24, lineHeight: 30, fontWeight: '600' as const },
  detailTitle: { fontSize: 24, lineHeight: 30, fontWeight: '600' as const },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontWeight: '600' as const },
  rowTitle: { fontSize: 16, lineHeight: 20, fontWeight: '500' as const },
  rowSubtitle: { fontSize: 14, lineHeight: 18 },
  compactRowTitle: { fontSize: 15, lineHeight: 19, fontWeight: '500' as const },
  compactRowSubtitle: { fontSize: 13, lineHeight: 17 },
  caption: { fontSize: 13, lineHeight: 17 },
  button: { fontSize: 15, lineHeight: 20, fontWeight: '600' as const },
  navigationTitle: { fontSize: 18, lineHeight: 22, fontWeight: '600' as const },
} as const;

export const controlSize = {
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
