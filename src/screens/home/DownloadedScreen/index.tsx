import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { Ionicons } from '@expo/vector-icons'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useDownloadedTracks } from 'react-native-nitro-player'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/hooks/useTheme'
import { useGridLayout } from '@/hooks/useGridLayout'
import { useTracks } from '@/hooks/tracks'

import TrackItem from '@/screens/home/components/Items/TrackItem'
import LibraryContent from '@/screens/home/components/Content'
import LibraryListHeader from '@/screens/home/components/Content/Header'
import SortBottomSheet from '@/screens/home/components/SortBottomSheet'
import GridSettingsBottomSheet from '@/screens/home/components/GridSettingsBottomSheet'

import {
  selectGridColumns,
  selectIsGridView,
  selectLibrarySortOrder,
} from '@/utils/redux/selectors/settingsSelectors'
import { setLibrarySortOrder } from '@/utils/redux/slices/settingsSlice'
import { LIBRARY_INITIAL_PAGE_SIZE, LIBRARY_PAGE_SIZE } from '@/constants/library'

export default function DownloadedScreen() {
  const router = useRouter()
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const { gridItemWidth, gridSpacing } = useGridLayout()

  const { tracks, isLoading } = useTracks()
  const { isTrackDownloaded } = useDownloadedTracks()

  const gridColumns = useSelector(selectGridColumns)
  const isGridView = useSelector(selectIsGridView)
  const sortOrder = useSelector(selectLibrarySortOrder)

  const sortSheetRef = useRef<BottomSheetModal>(null)
  const gridSettingsSheetRef = useRef<BottomSheetModal>(null)

  const [displayedCount, setDisplayedCount] = useState(LIBRARY_INITIAL_PAGE_SIZE)

  const downloadedTracks = useMemo(
    () => tracks.filter(t => isTrackDownloaded(t.id)).map(t => ({ ...t, type: 'Track' as const })),
    [tracks, isTrackDownloaded]
  )

  const sortedData = useMemo(() => {
    const data = [...downloadedTracks]
    if (sortOrder === 'title') {
      data.sort((a, b) => a.title.localeCompare(b.title))
    }
    return data
  }, [downloadedTracks, sortOrder])

  useEffect(() => {
    setDisplayedCount(LIBRARY_INITIAL_PAGE_SIZE)
  }, [sortOrder])

  const displayedData = useMemo(
    () => sortedData.slice(0, displayedCount),
    [sortedData, displayedCount]
  )

  const hasMore = displayedCount < sortedData.length
  const loadMore = useCallback(() => {
    if (hasMore) {
      setDisplayedCount(prev => Math.min(prev + LIBRARY_PAGE_SIZE, sortedData.length))
    }
  }, [hasMore, sortedData.length])

  const renderItem = ({ item }: { item: any }) => (
    <TrackItem
      song={item}
      isGridView={isGridView}
      gridWidth={gridItemWidth}
      gridSpacing={gridSpacing}
    />
  )

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <View style={[styles.header, { borderBottomColor: isDarkMode ? '#1C1C1E' : '#D1D1D6' }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#fff' : '#1C1C1E'} />
        </TouchableOpacity>
        <View pointerEvents="none" style={styles.titleWrapper}>
          <Text style={[styles.title, isDarkMode && styles.titleDark]}>
            {t('home.filters.downloaded')}
          </Text>
        </View>
        <View style={styles.headerButton} />
      </View>

      <LibraryContent
        data={displayedData}
        isLoading={isLoading}
        onEndReached={loadMore}
        hasMore={hasMore}
        isGridView={isGridView}
        gridColumns={gridColumns}
        gridItemWidth={gridItemWidth}
        estimatedItemSize={70}
        renderItem={renderItem}
        ListHeaderComponent={
          <LibraryListHeader
            sortOrder={sortOrder}
            onSortPress={() => sortSheetRef.current?.present()}
            onGridSettingsPress={() => gridSettingsSheetRef.current?.present()}
          />
        }
      />

      <SortBottomSheet
        ref={sortSheetRef}
        sortOrder={sortOrder}
        onSelect={value => {
          dispatch(setLibrarySortOrder(value))
          sortSheetRef.current?.dismiss()
        }}
      />
      <GridSettingsBottomSheet ref={gridSettingsSheetRef} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    padding: 6,
  },
  titleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  titleDark: {
    color: '#fff',
  },
})
