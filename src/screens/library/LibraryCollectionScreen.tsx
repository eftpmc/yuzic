import React, { useCallback, useMemo, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { toast } from '@backpackapp-io/react-native-toast'

import { DetailHeaderBar } from '@/components/DetailHeader'
import { usePlayingActions } from '@/contexts/PlayingContext'
import { useTheme } from '@/hooks/useTheme'
import { spacing, typography } from '@/constants/design'
import CollectionActions from './CollectionActions'
import LibraryList from './LibraryList'
import LoadingLibraryList from './Loading'
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

const COUNT_KEY: Record<LibraryCollectionType, string> = {
  playlists: 'library.count.playlists',
  albums: 'library.count.albums',
  artists: 'library.count.artists',
  tracks: 'library.count.tracks',
  downloaded: 'library.count.items',
}

/**
 * What this screen shows: which slice of the library, ordered how, called what.
 *
 * A caller that wants a time-ordered view — Home's "Recently added" and
 * "Recents" shelves both do — asks for a `sort` rather than for a screen of
 * its own. That is what a sort order is, and the sort control on the list says
 * so once you arrive, which a bespoke screen never did. `titleKey` lets a
 * shelf keep its own name over the list it leads to where the type's name
 * would be a worse fit than the shelf's.
 */
type CollectionParams = {
  type?: LibraryCollectionType
  sort?: SortOrder
  titleKey?: string
}

const LibraryCollectionScreen: React.FC = () => {
  const route = useRoute<any>()
  const params = (route.params ?? {}) as CollectionParams
  const { type, sort, titleKey } = params
  const { t } = useTranslation()
  const { colors } = useTheme()
  const sortLabels = useSortLabels()

  const [sortOrder, setSortOrder] = useState<SortOrder>(
    sort ?? (type ? DEFAULT_SORT[type] : 'recent')
  )

  const { items, isLoading } = useLibraryItems(type ?? null, sortOrder)
  const { playSongs } = usePlayingActions()

  const title = titleKey
    ? t(titleKey)
    : type
      ? t(TITLE_KEY[type])
      : t('library.title')

  // Only a list of tracks is a queue. A screen of albums or artists is a list
  // of collections, each with its own play action already.
  const playableTracks = useMemo(
    () => (type === 'tracks'
      ? items.flatMap(item => (item.kind === 'track' ? [item.data] : []))
      : []),
    [type, items]
  )

  const play = useCallback(async (shuffle: boolean) => {
    if (!playableTracks.length) return
    try {
      await playSongs(playableTracks, { shuffle, contextId: 'library-tracks' })
    } catch {
      toast.error(t('library.collection.playFailed'))
    }
  }, [playableTracks, playSongs, t])

  const count = items.length > 0
    ? t(type ? COUNT_KEY[type] : 'library.count.items', { count: items.length })
    : undefined

  // The bar above already names the screen, so there is no heading here — only
  // the actions, where the collection is actually a queue.
  const header = playableTracks.length > 0 ? (
    <View style={styles.actions}>
      <CollectionActions
        onPlay={() => { void play(false) }}
        onShuffle={() => { void play(true) }}
      />
    </View>
  ) : null

  return (
    <SafeAreaView
      testID="library-collection-screen"
      edges={['top']}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <DetailHeaderBar title={title} subtitle={count} />

      {isLoading && items.length === 0 ? (
        <LoadingLibraryList />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t('library.collection.empty')}
          </Text>
        </View>
      ) : (
        <LibraryList
          items={items}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          sortLabel={sortLabels[sortOrder]}
          header={header}
        />
      )}
    </SafeAreaView>
  )
}

export default LibraryCollectionScreen

const styles = StyleSheet.create({
  screen: { flex: 1 },
  actions: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  empty: { paddingHorizontal: spacing.page, paddingTop: spacing.xl },
  emptyText: { ...typography.rowSubtitle },
})
