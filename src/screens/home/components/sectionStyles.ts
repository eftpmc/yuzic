import { StyleSheet } from 'react-native'
import { spacing, typography } from '@/constants/design'
import { SECTION_H_PADDING } from '@/features/home/constants'

/**
 * Home's shelves sit on the same page inset as every other screen.
 *
 * They were on 12 while the rest of the app was on 16, which survived the move
 * to the spacing scale by hiding behind a constant — the lint rule sees a
 * literal, not an identifier. Home is the first screen anyone opens, so it was
 * the worst place to be the odd one out.
 *
 * Re-exported rather than redeclared: half the shelves import it from here and
 * half from `features/home/constants`, and for a while those were two separate
 * numbers that only happened to agree.
 */
export { SECTION_H_PADDING }
export const SECTION_GAP = spacing.md
export const SECTION_VISIBLE_ITEMS = 2.5

export function getSectionItemWidth(screenWidth: number): number {
  const available = screenWidth - SECTION_H_PADDING * 2
  return (available - SECTION_GAP * (SECTION_VISIBLE_ITEMS - 1)) / SECTION_VISIBLE_ITEMS
}

export const sectionStyles = StyleSheet.create({
  container: {
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.sectionTitle,
    marginBottom: spacing.md,
    marginLeft: SECTION_H_PADDING,
  },
  scrollContent: {
    paddingHorizontal: SECTION_H_PADDING,
  },
  item: {
    marginRight: SECTION_GAP,
    minWidth: 0,
  },
})
