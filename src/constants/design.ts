export const spacing = {
  page: 16,
  rowGap: 12,
  controlGap: 10,
} as const;

export const radius = {
  thumb: 6,
  card: 12,
  pill: 999,
} as const;

export const typography = {
  detailTitle: { fontSize: 24, fontWeight: '600' as const },
  sectionTitle: { fontSize: 20, fontWeight: '600' as const },
  rowTitle: { fontSize: 16, fontWeight: '500' as const },
  rowSubtitle: { fontSize: 14 },
  compactRowTitle: { fontSize: 15, fontWeight: '500' as const },
  compactRowSubtitle: { fontSize: 13 },
} as const;

export const controlSize = {
  iconDefault: 44,
  iconCompact: 36,
  detailSecondary: 40,
  detailPrimaryWidth: 112,
  detailPrimaryHeight: 48,
  mediaRowArt: 64,
  compactMediaRowArt: 44,
} as const;
