import { StyleSheet } from 'react-native'
import { spacing, typography } from '@/constants/design'

export const SECTION_H_PADDING = 12
export const SECTION_GAP = 12
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
