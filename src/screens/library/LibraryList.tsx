import React, { useCallback } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ArrowUpDown, Grid2x2, List } from 'lucide-react-native'

import { useTheme } from '@/hooks/useTheme'
import { hitSlopFor, spacing, typography } from '@/constants/design'
import { useRadius } from '@/hooks/useRadius'
import {
  selectIsGridView,
  selectGridColumns,
  selectGridSpacing,
} from '@/utils/redux/selectors/settingsSelectors'
import { setIsGridView } from '@/utils/redux/slices/settingsSlice'
import { gridItemWidth, libraryGutter } from './layout'
import AlbumItem from './components/Items/AlbumItem'
import ArtistItem from './components/Items/ArtistItem'
import PlaylistItem from './components/Items/PlaylistItem'
import TrackItem from './components/Items/TrackItem'
import SortBottomSheet from './components/SortBottomSheet'
import { useSheetRef } from '@/utils/useSheetRef'
import type { LibraryItem, SortOrder } from './librarySort'
import Touchable from '@/components/Touchable'

type Props = {
  items: LibraryItem[]
  sortOrder: SortOrder
  onSortChange: (order: SortOrder) => void
  sortLabel: string
  /** Rendered above the sort row — entry points on the tab, actions on a screen. */
  header?: React.ReactNode
}

/**
 * The library list itself: sort and grid controls, then the items.
 *
 * Shared by the library tab and every per-type screen so a track row looks and
 * behaves the same wherever it is reached from.
 */
const LibraryList: React.FC<Props> = ({
  items,
  sortOrder,
  onSortChange,
  sortLabel,
  header,
}) => {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const rad = useRadius()
  const dispatch = useDispatch()
  const isGridView = useSelector(selectIsGridView)
  const gridColumns = useSelector(selectGridColumns)
  const gridSpacing = useSelector(selectGridSpacing)
  const { width: screenWidth } = useWindowDimensions()

  const sortSheetRef = useSheetRef()

  const gutter = libraryGutter(isGridView, gridSpacing)
  const gridWidth = gridItemWidth(screenWidth, gridColumns, gridSpacing, gutter)

  const renderItem = useCallback(({ item }: { item: LibraryItem }) => {
    switch (item.kind) {
      case 'album':
        return (
          <AlbumItem
            album={item.data}
            isGridView={isGridView}
            gridWidth={gridWidth}
            gridSpacing={gridSpacing}
          />
        )
      case 'artist':
        return (
          <ArtistItem
            artist={item.data}
            id={item.data.id}
            name={item.data.name}
            subtext={item.data.subtext}
            cover={item.data.cover}
            isGridView={isGridView}
            gridWidth={gridWidth}
            gridSpacing={gridSpacing}
          />
        )
      case 'playlist':
        return (
          <PlaylistItem
            playlist={item.data}
            id={item.data.id}
            title={item.data.title}
            subtext={item.data.subtext}
            cover={item.data.cover}
            isGridView={isGridView}
            gridWidth={gridWidth}
            gridSpacing={gridSpacing}
          />
        )
      case 'track':
        return (
          <TrackItem
            song={item.data}
            isGridView={isGridView}
            gridWidth={gridWidth}
            gridSpacing={gridSpacing}
          />
        )
    }
  }, [isGridView, gridWidth, gridSpacing])

  return (
    <>
      <FlashList<LibraryItem>
        key={`${isGridView ? `grid-${gridColumns}` : 'list'}`}
        data={items}
        keyExtractor={item => `${item.kind}-${item.data.id}`}
        renderItem={renderItem}
        numColumns={isGridView ? gridColumns : 1}
        getItemType={item => item.kind}
        ListHeaderComponent={
          // The gutter is sized for the items; everything above them keeps the
          // app's own page inset, so give that back before it is applied twice.
          <View style={{ marginHorizontal: -gutter }}>
            {header}
            <View style={styles.sortRow}>
              <Touchable
                style={[styles.sortButton, { backgroundColor: colors.muted, borderRadius: rad.pill }]}
                onPress={() => sortSheetRef.current?.present()}
                accessibilityRole="button"
              >
                <ArrowUpDown size={17} color={colors.secondary} />
                <Text style={[styles.sortLabel, { color: colors.secondary }]}>
                  {sortLabel}
                </Text>
              </Touchable>
              <Touchable
                style={[styles.gridButton, { backgroundColor: colors.muted, borderRadius: rad.pill }]}
                hitSlop={hitSlopFor(34)}
                onPress={() => dispatch(setIsGridView(!isGridView))}
                accessibilityRole="button"
                accessibilityLabel={isGridView ? t('library.view.switchToList') : t('library.view.switchToGrid')}
              >
                {isGridView
                  ? <List size={17} color={colors.secondary} />
                  : <Grid2x2 size={17} color={colors.secondary} />
                }
              </Touchable>
            </View>
          </View>
        }
        contentContainerStyle={[
          styles.list,
          { paddingHorizontal: gutter },
        ]}
        showsVerticalScrollIndicator={false}
      />

      <SortBottomSheet
        ref={sortSheetRef}
        sortOrder={sortOrder}
        onSelect={onSortChange}
      />
    </>
  )
}

export default LibraryList

const styles = StyleSheet.create({
  list: { paddingTop: 0, paddingBottom: spacing.scrollClearance },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.inlineGap,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sortLabel: { ...typography.caption },
  gridButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
