import React, { useMemo } from 'react'
import { ScrollView, useWindowDimensions, View } from 'react-native'
import { useSelector } from 'react-redux'

import SkeletonGrid from '@/components/SkeletonGrid'
import SkeletonListRow from '@/components/SkeletonListRow'
import { spacing } from '@/constants/design'
import {
  selectGridColumns,
  selectGridSpacing,
  selectIsGridView,
} from '@/utils/redux/selectors/settingsSelectors'
import { gridItemWidth, libraryGutter } from './layout'

const PLACEHOLDER_ROWS = 8
const PLACEHOLDER_GRID_ROWS = 3

/** What a library row's artwork actually measures, so the placeholder is the
 * same size as the thing replacing it. */
const LIST_ART_SIZE = 52

/**
 * Placeholder for a library collection while its first sync runs.
 *
 * Follows the view the list is about to appear in: rows for a list, tiles for a
 * grid. A skeleton earns its place by predicting the layout, and eight rows in
 * front of a grid of covers predicts the wrong one.
 */
const LoadingLibraryList: React.FC = () => {
  const isGridView = useSelector(selectIsGridView)
  const gridColumns = useSelector(selectGridColumns)
  const gridSpacing = useSelector(selectGridSpacing)
  const { width } = useWindowDimensions()

  const rows = useMemo(() => Array.from({ length: PLACEHOLDER_ROWS }), [])

  const gutter = libraryGutter(isGridView, gridSpacing)

  return (
    <ScrollView
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: spacing.scrollClearance }}
    >
      {isGridView ? (
        <View style={{ paddingHorizontal: gutter }}>
          <SkeletonGrid
            itemSize={gridItemWidth(width, gridColumns, gridSpacing, gutter)}
            itemSpacing={gridSpacing}
            variant="album"
            count={gridColumns * PLACEHOLDER_GRID_ROWS}
          />
        </View>
      ) : (
        rows.map((_, index) => (
          <SkeletonListRow key={`library-loading-${index}`} artSize={LIST_ART_SIZE} />
        ))
      )}
    </ScrollView>
  )
}

export default LoadingLibraryList
