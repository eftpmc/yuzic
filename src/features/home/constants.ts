/** Shared layout constants for horizontal explore section grids */
export const SECTION_H_PADDING = 16
export const SECTION_GRID_GAP = 12
export const SECTION_VISIBLE_ITEMS = 2.5

/**
 * Shared stale-time values for Deezer explore section queries.
 * Charts/releases refresh every 6h; personalised discovery every 12h.
 */
export const STALE_DEEZER_CHARTS = 1000 * 60 * 60 * 6    // 6h
export const STALE_DEEZER_RELEASES = 1000 * 60 * 60 * 6   // 6h
export const STALE_DEEZER_DISCOVERY = 1000 * 60 * 60 * 12 // 12h
