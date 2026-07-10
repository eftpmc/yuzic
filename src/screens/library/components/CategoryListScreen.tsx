import React, { useCallback, useMemo, useRef } from 'react'
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import { FlashList, type FlashListRef } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ArrowUpDown, ChevronLeft, Grid2x2, List } from 'lucide-react-native'

import { useTheme } from '@/hooks/useTheme'
import {
  selectGridColumns,
  selectGridSpacing,
  selectLibraryGridView,
  selectLibrarySortOrder,
} from '@/utils/redux/selectors/settingsSelectors'
import {
  setLibraryGridView,
  setLibrarySortOrder,
  type LibraryCategory,
  type LibrarySortOrder,
} from '@/utils/redux/slices/settingsSlice'
import { useSheetRef } from '@/utils/useSheetRef'
import SortBottomSheet from './SortBottomSheet'
import GridSettingsBottomSheet from './GridSettingsBottomSheet'
import AZIndex from './AZIndex'

export const LIST_PADDING = 12

const collator = new Intl.Collator(undefined, { sensitivity: 'base' })

function sortGeneric<T>(
  items: T[],
  order: LibrarySortOrder,
  opts: {
    getTitle: (item: T) => string
    getYear?: (item: T) => number | undefined
    getLastPlayedMs?: (item: T) => number
    getPlayCount?: (item: T) => number
    getCreatedMs?: (item: T) => number
  }
): T[] {
  return [...items].sort((a, b) => {
    switch (order) {
      case 'title':
        return collator.compare(opts.getTitle(a), opts.getTitle(b))
      case 'year':
        return (opts.getYear?.(b) ?? 0) - (opts.getYear?.(a) ?? 0)
      case 'recent':
        return (opts.getLastPlayedMs?.(b) ?? 0) - (opts.getLastPlayedMs?.(a) ?? 0)
      case 'userplays':
        return (opts.getPlayCount?.(b) ?? 0) - (opts.getPlayCount?.(a) ?? 0)
      case 'recentlyAdded':
        return (opts.getCreatedMs?.(b) ?? 0) - (opts.getCreatedMs?.(a) ?? 0)
      default:
        return 0
    }
  })
}

const SORT_LABEL_KEYS: Record<LibrarySortOrder, string> = {
  recent: 'home.sort.mostRecent',
  recentlyAdded: 'home.sort.recentlyAdded',
  title: 'home.sort.alphabetical',
  year: 'home.sort.releaseYear',
  userplays: 'home.sort.mostPlayed',
}

interface CategoryListScreenProps<T> {
  category: LibraryCategory
  title: string
  items: T[]
  getId: (item: T) => string
  getTitle: (item: T) => string
  getYear?: (item: T) => number | undefined
  getLastPlayedMs?: (item: T) => number
  getPlayCount?: (item: T) => number
  getCreatedMs?: (item: T) => number
  sortOptions: LibrarySortOrder[]
  renderItem: (
    item: T,
    gridProps: { isGridView: boolean; gridWidth: number; gridSpacing: number }
  ) => React.ReactElement
  getItemType?: (item: T) => string
}

export default function CategoryListScreen<T>({
  category,
  title,
  items,
  getId,
  getTitle,
  getYear,
  getLastPlayedMs,
  getPlayCount,
  getCreatedMs,
  sortOptions,
  renderItem,
  getItemType,
}: CategoryListScreenProps<T>) {
  const router = useRouter()
  const { t } = useTranslation()
  const { colors } = useTheme()
  const dispatch = useDispatch()

  const isGridView = useSelector(selectLibraryGridView(category))
  const sortOrder = useSelector(selectLibrarySortOrder(category))
  const gridColumns = useSelector(selectGridColumns)
  const gridSpacing = useSelector(selectGridSpacing)

  const sortSheetRef = useSheetRef()
  const gridSheetRef = useSheetRef()
  const listRef = useRef<FlashListRef<T>>(null)

  const { width: screenWidth } = useWindowDimensions()
  const gridWidth = (screenWidth - LIST_PADDING * 2 - (gridColumns + 1) * gridSpacing) / gridColumns

  const sorted = useMemo(
    () => sortGeneric(items, sortOrder, { getTitle, getYear, getLastPlayedMs, getPlayCount, getCreatedMs }),
    [items, sortOrder, getTitle, getYear, getLastPlayedMs, getPlayCount, getCreatedMs]
  )

  const { availableLetters, letterToIndex } = useMemo(() => {
    if (sortOrder !== 'title') {
      return { availableLetters: new Set<string>(), letterToIndex: new Map<string, number>() }
    }
    const avail = new Set<string>()
    const map = new Map<string, number>()
    sorted.forEach((item, index) => {
      const rawTitle = getTitle(item).trim()
      const first = rawTitle ? rawTitle[0].toUpperCase() : '#'
      const letter = /[A-Z]/.test(first) ? first : '#'
      if (!avail.has(letter)) {
        avail.add(letter)
        map.set(letter, index)
      }
    })
    return { availableLetters: avail, letterToIndex: map }
  }, [sorted, sortOrder, getTitle])

  const handleSelectLetter = useCallback((letter: string) => {
    const index = letterToIndex.get(letter)
    if (index != null) listRef.current?.scrollToIndex({ index, animated: true })
  }, [letterToIndex])

  const flatRenderItem = useCallback(
    ({ item }: { item: T }) => renderItem(item, { isGridView, gridWidth, gridSpacing }),
    [renderItem, isGridView, gridWidth, gridSpacing]
  )

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityLabel="Back"
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={24} color={colors.secondary} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={[styles.sortRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.sortButton} onPress={() => sortSheetRef.current?.present()}>
          <ArrowUpDown size={17} color={colors.secondary} />
          <Text style={[styles.sortLabel, { color: colors.secondary }]}>
            {t(SORT_LABEL_KEYS[sortOrder])}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridButton} onPress={() => gridSheetRef.current?.present()}>
          {isGridView ? <List size={17} color={colors.secondary} /> : <Grid2x2 size={17} color={colors.secondary} />}
        </TouchableOpacity>
      </View>

      <View style={styles.listArea}>
        <FlashList<T>
          ref={listRef}
          key={`${isGridView ? `grid-${gridColumns}` : 'list'}`}
          data={sorted}
          keyExtractor={getId}
          renderItem={flatRenderItem}
          numColumns={isGridView ? gridColumns : 1}
          getItemType={getItemType}
          contentContainerStyle={[
            styles.list,
            isGridView && { paddingHorizontal: LIST_PADDING },
            { paddingBottom: 180 },
          ]}
          showsVerticalScrollIndicator={false}
        />
        {sortOrder === 'title' && availableLetters.size > 0 && (
          <AZIndex availableLetters={availableLetters} onSelectLetter={handleSelectLetter} />
        )}
      </View>

      <SortBottomSheet
        ref={sortSheetRef}
        sortOrder={sortOrder}
        options={sortOptions}
        onSelect={(value) => dispatch(setLibrarySortOrder({ category, value }))}
      />

      <GridSettingsBottomSheet
        ref={gridSheetRef}
        isGridView={isGridView}
        onSetGridView={(value) => dispatch(setLibraryGridView({ category, value }))}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 24,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  gridButton: {
    padding: 4,
  },
  listArea: {
    flex: 1,
  },
  list: {
    paddingVertical: 8,
    paddingHorizontal: LIST_PADDING,
  },
})
