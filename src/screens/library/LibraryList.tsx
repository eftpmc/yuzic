import React, { useCallback } from 'react'
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useSelector } from 'react-redux'
import { ArrowUpDown, Grid2x2, List } from 'lucide-react-native'

import { useTheme } from '@/hooks/useTheme'
import {
  selectIsGridView,
  selectGridColumns,
  selectGridSpacing,
} from '@/utils/redux/selectors/settingsSelectors'
import AlbumItem from './components/Items/AlbumItem'
import ArtistItem from './components/Items/ArtistItem'
import PlaylistItem from './components/Items/PlaylistItem'
import TrackItem from './components/Items/TrackItem'
import SortBottomSheet from './components/SortBottomSheet'
import GridSettingsBottomSheet from './components/GridSettingsBottomSheet'
import { useSheetRef } from '@/utils/useSheetRef'
import type { LibraryItem, SortOrder } from './librarySort'

export const LIST_PADDING = 12

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
  const { colors } = useTheme()
  const isGridView = useSelector(selectIsGridView)
  const gridColumns = useSelector(selectGridColumns)
  const gridSpacing = useSelector(selectGridSpacing)
  const { width: screenWidth } = useWindowDimensions()

  const sortSheetRef = useSheetRef()
  const gridSheetRef = useSheetRef()

  const gridWidth =
    (screenWidth - LIST_PADDING * 2 - (gridColumns + 1) * gridSpacing) / gridColumns

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
          <View>
            {header}
            <View style={[styles.sortRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => sortSheetRef.current?.present()}
              >
                <ArrowUpDown size={17} color={colors.secondary} />
                <Text style={[styles.sortLabel, { color: colors.secondary }]}>
                  {sortLabel}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.gridButton}
                onPress={() => gridSheetRef.current?.present()}
              >
                {isGridView
                  ? <List size={17} color={colors.secondary} />
                  : <Grid2x2 size={17} color={colors.secondary} />
                }
              </TouchableOpacity>
            </View>
          </View>
        }
        contentContainerStyle={[
          styles.list,
          isGridView && { paddingHorizontal: LIST_PADDING },
          { paddingBottom: 180 },
        ]}
        showsVerticalScrollIndicator={false}
      />

      <SortBottomSheet
        ref={sortSheetRef}
        sortOrder={sortOrder}
        onSelect={onSortChange}
      />

      <GridSettingsBottomSheet ref={gridSheetRef} />
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortButton: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortLabel: { fontSize: 14 },
  gridButton: { padding: 4 },
})
