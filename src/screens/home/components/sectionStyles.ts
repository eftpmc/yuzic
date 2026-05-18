import { StyleSheet } from 'react-native'

export const SECTION_H_PADDING = 12
export const SECTION_GAP = 12
export const SECTION_VISIBLE_ITEMS = 2.5

export function getSectionItemWidth(screenWidth: number): number {
  const available = screenWidth - SECTION_H_PADDING * 2
  return (available - SECTION_GAP * (SECTION_VISIBLE_ITEMS - 1)) / SECTION_VISIBLE_ITEMS
}

export const sectionStyles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
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
