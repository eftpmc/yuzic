import React, { useCallback, useMemo } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ArrowUpDown, Grid2x2, List } from 'lucide-react-native'

import { useTheme } from '@/hooks/useTheme'
import { hitSlopFor, spacing, typography } from '@/constants/design'
import { useRadius } from '@/hooks/useRadius'
import {
  selectLibraryViewMode,
  selectGridColumns,
  selectGridSpacing,
} from '@/utils/redux/selectors/settingsSelectors'
import { setIsGridView, setLibraryViewMode } from '@/utils/redux/slices/settingsSlice'
import { gridItemWidth, libraryGutter } from './layout'
import AlbumItem from './components/Items/AlbumItem'
import ArtistItem from './components/Items/ArtistItem'
import PlaylistItem from './components/Items/PlaylistItem'
import TrackItem from './components/Items/TrackItem'
import SortBottomSheet from './components/SortBottomSheet'
import { useSheetRef } from '@/utils/useSheetRef'
import type { LibraryCollectionType, LibraryItem, SortOrder } from './librarySort'
import Touchable from '@/components/Touchable'
import { useScrollClearance } from '@/hooks/useScrollClearance'

type Props = {
  items: LibraryItem[]
  sortOrder: SortOrder
  onSortChange: (order: SortOrder) => void
  sortLabel: string
  /** Rendered above the sort row — entry points on the tab, actions on a screen. */
  header?: React.ReactNode
  /** Which collection this is, so grid-or-list is remembered per kind rather
   *  than once for all of them. Null for a list that isn't one of them. */
  collection?: LibraryCollectionType | null
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
  collection = null,
}) => {
  const { t } = useTranslation()
  const scrollClearance = useScrollClearance()
  const { colors } = useTheme()
  const rad = useRadius()
  const dispatch = useDispatch()
  const isGridView = useSelector(selectLibraryViewMode(collection))
  const gridColumns = useSelector(selectGridColumns)
  const gridSpacing = useSelector(selectGridSpacing)
  const { width: screenWidth } = useWindowDimensions()

  const sortSheetRef = useSheetRef()

  const gutter = libraryGutter(isGridView, gridSpacing)
  const gridWidth = gridItemWidth(screenWidth, gridColumns, gridSpacing, gutter)

  /**
   * Whether a row should say what kind of thing it is.
   *
   * "Album • Various Artists" earns the prefix on Home, where one shelf mixes
   * albums with artists and playlists and the word is the only thing telling
   * them apart. On a screen that is nothing but albums it is the same word on
   * every row, and it is spending the line the artist name needs — in a
   * three-up grid the prefix always fitted and the artist almost never did.
   *
   * Read off the items rather than passed in, so `downloaded` — the one
   * collection that really is mixed — keeps its labels without the callers
   * having to know which collections those are.
   */
  const showTypeLabel = useMemo(() => {
    const kinds = new Set(items.map(item => item.kind))
    return kinds.size > 1
  }, [items])

  const renderItem = useCallback(({ item }: { item: LibraryItem }) => {
    switch (item.kind) {
      case 'album':
        return (
          <AlbumItem
            album={item.data}
            showTypeLabel={showTypeLabel}
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
            subtext={showTypeLabel ? item.data.subtext : undefined}
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
            subtext={showTypeLabel ? item.data.subtext : undefined}
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
  }, [isGridView, gridWidth, gridSpacing, showTypeLabel])

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
                onPress={() => dispatch(
                  collection
                    ? setLibraryViewMode({ collection, isGridView: !isGridView })
                    : setIsGridView(!isGridView)
                )}
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
          { paddingHorizontal: gutter, paddingBottom: scrollClearance },
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
  list: { paddingTop: 0 },
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
