import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useTheme } from '@/hooks/useTheme'
import SkeletonTile from './SkeletonTile'

type Props = {
  itemSize: number
  /** Margin each tile carries on both sides, matching the real grid's cells. */
  itemSpacing: number
  variant: 'album' | 'artist'
  count: number
}

/**
 * A wrapped grid of placeholder tiles.
 *
 * Laid out with the same per-cell margins as the grid it stands in for, so the
 * real covers land where the placeholders were instead of shifting sideways
 * when the sync finishes.
 */
export default function SkeletonGrid({ itemSize, itemSpacing, variant, count }: Props) {
  const { isDarkMode } = useTheme()
  const colorMode = isDarkMode ? 'dark' : 'light'

  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, index) => (
        <View
          key={`${variant}-grid-skeleton-${index}`}
          style={{ marginHorizontal: itemSpacing, marginVertical: itemSpacing }}
        >
          <SkeletonTile size={itemSize} variant={variant} colorMode={colorMode} />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
})
