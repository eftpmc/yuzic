import React, { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'

import { DetailHeaderBar } from '@/components/DetailHeader'
import { useTheme } from '@/hooks/useTheme'
import LibraryList from './LibraryList'
import { useLibraryItems } from './useLibraryItems'
import { useSortLabels } from './useSortLabels'
import type { LibraryCollectionType, SortOrder } from './librarySort'

/** Default order per type: releases read best newest-first, names alphabetically. */
const DEFAULT_SORT: Record<LibraryCollectionType, SortOrder> = {
  playlists: 'recent',
  albums: 'recentlyAdded',
  artists: 'title',
  tracks: 'title',
  downloaded: 'recentlyAdded',
}

const TITLE_KEY: Record<LibraryCollectionType, string> = {
  playlists: 'home.filters.playlists',
  albums: 'home.filters.albums',
  artists: 'home.filters.artists',
  tracks: 'home.filters.tracks',
  downloaded: 'home.filters.downloaded',
}

const LibraryCollectionScreen: React.FC = () => {
  const route = useRoute<any>()
  const type = route.params?.type as LibraryCollectionType | undefined
  const { t } = useTranslation()
  const { colors } = useTheme()
  const sortLabels = useSortLabels()

  const [sortOrder, setSortOrder] = useState<SortOrder>(
    type ? DEFAULT_SORT[type] : 'recent'
  )

  const items = useLibraryItems(type ?? null, sortOrder)

  return (
    <SafeAreaView
      testID="library-collection-screen"
      edges={['top']}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <DetailHeaderBar title={type ? t(TITLE_KEY[type]) : t('library.title')} />
      {items.length === 0 ? (
        <Text style={[styles.empty, { color: colors.subtext }]}>
          {t('library.collection.empty')}
        </Text>
      ) : (
        <LibraryList
          items={items}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          sortLabel={sortLabels[sortOrder]}
        />
      )}
    </SafeAreaView>
  )
}

export default LibraryCollectionScreen

const styles = StyleSheet.create({
  screen: { flex: 1 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 14 },
})
