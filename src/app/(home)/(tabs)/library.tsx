import React, { useCallback, useMemo } from 'react'
import { StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ChevronRight } from 'lucide-react-native'

import { useTheme } from '@/hooks/useTheme'
import { useAlbums } from '@/hooks/albums'
import { useAccountSheet } from '@/contexts/AccountSheetContext'
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import {
  selectGridColumns,
  selectGridSpacing,
} from '@/utils/redux/selectors/settingsSelectors'
import { spacing, typography } from '@/constants/design'
import type { AlbumBase } from '@/types'

import TabHeader from '@/components/TabHeader'
import SectionHeader from '@/components/SectionHeader'
import AlbumItem from '@/screens/library/components/Items/AlbumItem'
import SkeletonGrid from '@/components/SkeletonGrid'
import LibraryEntryRows from '@/screens/library/LibraryEntryRows'
import { gridItemWidth, libraryGutter } from '@/screens/library/layout'

/** Enough to fill a couple of rows without turning the index into a list. */
const RECENT_ALBUM_COUNT = 12

function addedAt(album: AlbumBase): number {
  return album.created ? new Date(album.created).getTime() : 0
}

/**
 * The library index: one entry point per entity type, then what arrived most
 * recently.
 *
 * The recent grid is a short, titled section rather than the full sorted
 * library — a complete list here would duplicate the screens the rows above
 * lead to. It ends in a way through to all of them rather than at an arbitrary
 * twelfth album, so it reads as the front of the albums screen, not a stub.
 *
 * The entry rows render immediately, even mid-sync: they are the way into every
 * other screen, and they cost nothing to show. Only the grid waits, and it
 * waits as placeholder tiles the covers can land on.
 */
export default function LibraryScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const navigation = useNavigation<any>()
  const activeServer = useSelector(selectActiveServer)
  const username = activeServer?.username
  const { openAccountSheet } = useAccountSheet()
  const gridColumns = useSelector(selectGridColumns)
  const gridSpacing = useSelector(selectGridSpacing)
  const { width: screenWidth } = useWindowDimensions()

  const { albums, isLoading } = useAlbums()

  const recent = useMemo(
    () => [...albums].sort((a, b) => addedAt(b) - addedAt(a)).slice(0, RECENT_ALBUM_COUNT),
    [albums]
  )

  const gutter = libraryGutter(true, gridSpacing)
  const gridWidth = gridItemWidth(screenWidth, gridColumns, gridSpacing, gutter)

  const renderItem = useCallback(({ item }: { item: AlbumBase }) => (
    <AlbumItem
      album={item}
      isGridView
      gridWidth={gridWidth}
      gridSpacing={gridSpacing}
    />
  ), [gridWidth, gridSpacing])

  const openAlbums = useCallback(
    () => navigation.push('libraryCollectionView', { type: 'albums' }),
    [navigation]
  )

  const showPlaceholders = isLoading && recent.length === 0

  return (
    <SafeAreaView
      testID="library-screen"
      edges={['top']}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <TabHeader
        title={t('library.title')}
        username={username}
        onAccountPress={openAccountSheet}
      />

      <FlashList<AlbumBase>
        data={recent}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        numColumns={gridColumns}
        ListHeaderComponent={
          // The gutter is sized for the grid; the rows and the section header
          // carry the app's own page inset, so give that back before it is
          // applied twice and the three of them stop lining up.
          <View style={{ marginHorizontal: -gutter }}>
            <LibraryEntryRows />
            {(recent.length > 0 || showPlaceholders) && (
              <SectionHeader
                title={t('library.recentlyAdded')}
                style={styles.sectionHeader}
                action={
                  recent.length > 0 ? (
                    <TouchableOpacity
                      testID="library-recent-see-all"
                      accessibilityRole="button"
                      onPress={openAlbums}
                      style={styles.seeAll}
                      hitSlop={8}
                    >
                      <Text style={[styles.seeAllLabel, { color: colors.subtext }]}>
                        {t('library.seeAll')}
                      </Text>
                      <ChevronRight size={16} color={colors.subtext} />
                    </TouchableOpacity>
                  ) : undefined
                }
              />
            )}
          </View>
        }
        ListEmptyComponent={
          showPlaceholders ? (
            <SkeletonGrid
              itemSize={gridWidth}
              itemSpacing={gridSpacing}
              variant="album"
              count={gridColumns * 2}
            />
          ) : null
        }
        contentContainerStyle={[styles.list, { paddingHorizontal: gutter }]}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingBottom: 180 },
  sectionHeader: { marginTop: spacing.section },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  seeAllLabel: { ...typography.caption },
})
