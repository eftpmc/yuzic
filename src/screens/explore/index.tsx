import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useTheme } from '@/hooks/useTheme'
import {
  useClearExploreNewData,
  useExploreMeta,
  useRetryExploreSync,
} from '@/features/explore/hooks/useExploreMeta'
import ArtistsForYouSection from './components/ArtistsForYouSection'
import AlbumsForYouSection from './components/AlbumsForYouSection'
import NewAlbumsSection from './components/NewAlbumsSection'
import ViewAllBottomSheet, {
  type ViewAllItem,
  type ViewAllVariant,
} from './components/ViewAllBottomSheet'
import { useExploreArtists } from '@/features/explore/hooks/useExploreArtists'
import { useExploreAlbums } from '@/features/explore/hooks/useExploreAlbums'
import { useExploreNewAlbums } from '@/features/explore/hooks/useExploreNewAlbums'
import type { ExternalArtistBase, ExternalAlbumBase } from '@/types'

const H_PADDING = 16

function Section({
  title,
  children,
  isDarkMode,
  showViewAll,
  onViewAll,
}: {
  title: string
  children: React.ReactNode
  isDarkMode: boolean
  showViewAll?: boolean
  onViewAll?: () => void
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text
          numberOfLines={1}
          style={[
            styles.sectionTitle,
            isDarkMode && styles.sectionTitleDark,
          ]}
        >
          {title}
        </Text>
        {showViewAll && onViewAll ? (
          <TouchableOpacity
            onPress={onViewAll}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text
              style={[
                styles.viewAll,
                isDarkMode && styles.viewAllDark,
              ]}
            >
              View all
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
      {children}
    </View>
  )
}

type ViewAllState = {
  variant: ViewAllVariant
  items: ViewAllItem[]
}

export default function Explore() {
  const { isDarkMode } = useTheme()
  const navigation = useNavigation()
  const [refreshing, setRefreshing] = useState(false)
  const [shuffleKey, setShuffleKey] = useState(0)
  const [viewAll, setViewAll] = useState<ViewAllState | null>(null)
  const sheetRef = useRef<BottomSheetModal>(null)
  const clearNewData = useClearExploreNewData()
  const { lastSyncError } = useExploreMeta()
  const retrySync = useRetryExploreSync()

  useEffect(() => {
    clearNewData()
  }, [clearNewData])

  const artists = useExploreArtists(shuffleKey)
  const albums = useExploreAlbums(shuffleKey)
  const newAlbums = useExploreNewAlbums(shuffleKey)

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setShuffleKey((k) => k + 1)
    setRefreshing(false)
  }, [])

  const openViewAll = useCallback(
    (variant: ViewAllVariant, items: ViewAllItem[]) => {
      setViewAll({ variant, items })
    },
    []
  )

  const closeViewAll = useCallback(() => {
    sheetRef.current?.dismiss()
  }, [])

  const handleViewAllDismissed = useCallback(() => {
    setViewAll(null)
  }, [])

  useEffect(() => {
    if (viewAll) sheetRef.current?.present()
  }, [viewAll])

  const onViewAllItemPress = useCallback(
    (item: ViewAllItem) => {
      if (!viewAll) return
      if (viewAll.variant === 'artists') {
        const a = item as ExternalArtistBase
        navigation.navigate('externalArtistView', {
          mbid: a.id,
          name: a.name,
        })
      } else {
        navigation.navigate('externalAlbumView', {
          albumId: (item as ExternalAlbumBase).id,
        })
      }
    },
    [viewAll, navigation]
  )

  return (
    <ScrollView
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
      ]}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: 150 },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={isDarkMode ? '#fff' : '#000'}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {lastSyncError ? (
        <View style={styles.errorBanner}>
          <Text
            numberOfLines={2}
            style={[
              styles.errorText,
              isDarkMode && styles.errorTextDark,
            ]}
          >
            {lastSyncError}
          </Text>
          <TouchableOpacity
            onPress={retrySync}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text
              style={[
                styles.retryText,
                isDarkMode && styles.retryTextDark,
              ]}
            >
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Section
        title="Artists for You"
        isDarkMode={isDarkMode}
        showViewAll={artists.data.length > 0}
        onViewAll={() =>
          openViewAll('artists', artists.allData as ViewAllItem[])
        }
      >
        <ArtistsForYouSection
          data={artists.data}
          ready={artists.ready}
        />
      </Section>

      <Section
        title="New Albums to Check Out"
        isDarkMode={isDarkMode}
        showViewAll={newAlbums.data.length > 0}
        onViewAll={() =>
          openViewAll('albums', newAlbums.allData as ViewAllItem[])
        }
      >
        <NewAlbumsSection
          data={newAlbums.data}
          ready={newAlbums.ready}
        />
      </Section>

      <Section
        title="Albums You Might Like"
        isDarkMode={isDarkMode}
        showViewAll={albums.data.length > 0}
        onViewAll={() =>
          openViewAll('albums', albums.allData as ViewAllItem[])
        }
      >
        <AlbumsForYouSection
          data={albums.data}
          ready={albums.ready}
        />
      </Section>

      {viewAll ? (
        <ViewAllBottomSheet
          ref={sheetRef}
          variant={viewAll.variant}
          items={viewAll.items}
          onItemPress={onViewAllItemPress}
          onClose={closeViewAll}
          onDismissed={handleViewAllDismissed}
        />
      ) : null}
    </ScrollView>
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
  content: {
    paddingTop: 12,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: H_PADDING,
    paddingVertical: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  errorTextDark: {
    color: '#aaa',
  },
  retryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  retryTextDark: {
    color: '#fff',
  },
  section: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: H_PADDING,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  sectionTitleDark: {
    color: '#fff',
  },
  viewAll: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  viewAllDark: {
    color: '#aaa',
  },
})