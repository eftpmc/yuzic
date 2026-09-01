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
import CollectionArtwork from './CollectionArtwork'
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
  recentlyAdded: 'recentlyAdded',
  downloaded: 'recentlyAdded',
}

const TITLE_KEY: Record<LibraryCollectionType, string> = {
  playlists: 'home.filters.playlists',
  albums: 'home.filters.albums',
  artists: 'home.filters.artists',
  tracks: 'home.filters.tracks',
  recentlyAdded: 'library.recentlyAdded',
  downloaded: 'home.filters.downloaded',
}

/** Big enough to carry the top of the screen, small enough to leave the title
 * beside it rather than under it. */
const ARTWORK_SIZE = 132

/** Covers are only worth reading from the front of the list — the mosaic shows
 * four, and scanning thousands of items for them would cost more than it says. */
const ARTWORK_SEARCH_DEPTH = 24

const COUNT_KEY: Record<LibraryCollectionType, string> = {
  playlists: 'library.count.playlists',
  albums: 'library.count.albums',
  artists: 'library.count.artists',
  tracks: 'library.count.tracks',
  recentlyAdded: 'library.count.albums',
  downloaded: 'library.count.items',
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

  const { items, isLoading } = useLibraryItems(type ?? null, sortOrder)
  const { playSongs } = usePlayingActions()

  const title = type ? t(TITLE_KEY[type]) : t('library.title')

  // Only a list of tracks is a queue. A screen of albums or artists is a list
  // of collections, each with its own play action already.
  const playableTracks = useMemo(
    () => (type === 'tracks'
      ? items.flatMap(item => (item.kind === 'track' ? [item.data] : []))
      : []),
    [type, items]
  )

  // Whatever is at the top of the current sort, so the artwork changes with the
  // order rather than being fixed to one arbitrary four.
  const covers = useMemo(
    () => items
      .slice(0, ARTWORK_SEARCH_DEPTH)
      .map(item => item.data.cover)
      .filter(cover => cover != null)
      .slice(0, 4),
    [items]
  )

  const play = useCallback(async (shuffle: boolean) => {
    if (!playableTracks.length) return
    try {
      await playSongs(playableTracks, { shuffle, contextId: 'library-tracks' })
    } catch {
      toast.error(t('library.collection.playFailed'))
    }
  }, [playableTracks, playSongs, t])

  const header = (
    <View style={styles.header}>
      <View style={styles.heading}>
        <CollectionArtwork covers={covers} size={ARTWORK_SIZE} />
        <View style={styles.headingText}>
          <Text style={[styles.title, { color: colors.secondary }]} numberOfLines={3}>
            {title}
          </Text>
          {items.length > 0 && (
            <Text style={[styles.count, { color: colors.subtext }]}>
              {t(type ? COUNT_KEY[type] : 'library.count.items', { count: items.length })}
            </Text>
          )}
        </View>
      </View>

      {playableTracks.length > 0 && (
        <View style={styles.actions}>
          <CollectionActions
            onPlay={() => { void play(false) }}
            onShuffle={() => { void play(true) }}
          />
        </View>
      )}
    </View>
  )

  return (
    <SafeAreaView
      testID="library-collection-screen"
      edges={['top']}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <DetailHeaderBar title={title} />

      {isLoading && items.length === 0 ? (
        <LoadingLibraryList />
      ) : items.length === 0 ? (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.secondary }]}>{title}</Text>
          <Text style={[styles.empty, { color: colors.subtext }]}>
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
  header: { paddingHorizontal: spacing.page, paddingTop: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  headingText: { flex: 1, minWidth: 0 },
  title: { ...typography.detailTitle },
  count: { ...typography.caption, marginTop: spacing.xs },
  actions: { marginTop: spacing.lg },
  empty: { ...typography.rowSubtitle, marginTop: spacing.lg },
})
