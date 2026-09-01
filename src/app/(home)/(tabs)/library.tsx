import React, { useCallback, useMemo } from 'react'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'

import { useTheme } from '@/hooks/useTheme'
import { useAlbums } from '@/hooks/albums'
import { useAccountSheet } from '@/contexts/AccountSheetContext'
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import {
  selectGridColumns,
  selectGridSpacing,
} from '@/utils/redux/selectors/settingsSelectors'
import { spacing } from '@/constants/design'
import type { AlbumBase } from '@/types'

import TabHeader from '@/components/TabHeader'
import SectionHeader from '@/components/SectionHeader'
import AlbumItem from '@/screens/library/components/Items/AlbumItem'
import LibraryEntryRows from '@/screens/library/LibraryEntryRows'
import LoadingLibraryList from '@/screens/library/Loading'
import { LIST_PADDING } from '@/screens/library/LibraryList'

/** Enough to fill a couple of rows without turning the index into a list. */
const RECENT_ALBUM_COUNT = 12

function addedAt(album: AlbumBase): number {
  return album.created ? new Date(album.created).getTime() : 0
}

/**
 * The library index: one entry point per entity type, then what arrived most
 * recently.
 *
 * The recent grid is deliberately a short, titled section rather than the full
 * sorted library — a complete list here would duplicate the screens the rows
 * above lead to, and read as a second library stacked under the first.
 */
export default function LibraryScreen() {
  const { t } = useTranslation()
  const { colors } = useTheme()
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

  const gridWidth =
    (screenWidth - LIST_PADDING * 2 - (gridColumns + 1) * gridSpacing) / gridColumns

  const renderItem = useCallback(({ item }: { item: AlbumBase }) => (
    <AlbumItem
      album={item}
      isGridView
      gridWidth={gridWidth}
      gridSpacing={gridSpacing}
    />
  ), [gridWidth, gridSpacing])

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

      {isLoading && albums.length === 0 ? (
        <LoadingLibraryList />
      ) : (
        <FlashList<AlbumBase>
          data={recent}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          numColumns={gridColumns}
          ListHeaderComponent={
            <View>
              <LibraryEntryRows />
              {recent.length > 0 && (
                <SectionHeader
                  title={t('library.recentlyAdded')}
                  style={styles.sectionHeader}
                />
              )}
            </View>
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  list: { paddingHorizontal: LIST_PADDING, paddingBottom: 180 },
  sectionHeader: { marginTop: spacing.section, paddingHorizontal: 0 },
})
