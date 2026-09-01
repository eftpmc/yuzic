import { spacing } from '@/constants/design'

/**
 * The horizontal inset a list-mode row draws inside its own touch box.
 *
 * `LibraryItem` pads itself so the pressed-state background extends past the
 * artwork; the list has to account for it or the artwork sits too far in.
 */
export const LIST_ITEM_INSET = 4

/**
 * Horizontal padding for a library list's content container.
 *
 * Sized so the thing you actually look at — a row's thumbnail in list mode, a
 * cell's cover art in grid mode — lands `spacing.page` from the screen edge in
 * both modes, since each already carries an inset of its own. Grid cells add
 * `gridSpacing` as a margin, so the gutter gives back only the difference; a
 * spacing wide enough on its own leaves no gutter rather than a negative one.
 */
export function libraryGutter(isGridView: boolean, gridSpacing: number): number {
  return isGridView
    ? Math.max(spacing.page - gridSpacing, 0)
    : spacing.page - LIST_ITEM_INSET
}

/**
 * Width of one grid cell's artwork.
 *
 * Every cell carries `gridSpacing` of margin on both sides, so a row of
 * `columns` cells spends `columns * gridSpacing * 2` on margins — not
 * `(columns + 1) * gridSpacing`, which under-counts for every column past the
 * first and overflows the row.
 */
export function gridItemWidth(
  screenWidth: number,
  columns: number,
  gridSpacing: number,
  gutter: number
): number {
  const available = screenWidth - gutter * 2 - columns * gridSpacing * 2
  return Math.max(available / columns, 0)
}
