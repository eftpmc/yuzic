import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useDispatch, useSelector } from 'react-redux'
import { Ionicons } from '@expo/vector-icons'
import { BottomSheetModal } from '@gorhom/bottom-sheet'

import { useTheme } from '@/hooks/useTheme'
import { useGridLayout } from '@/hooks/useGridLayout'
import { useAlbums } from '@/hooks/albums'
import { useArtists } from '@/hooks/artists'
import { usePlaylists } from '@/hooks/playlists'
import { useTracks } from '@/hooks/tracks'
import { useTranslation } from 'react-i18next'

import AlbumItem from '@/screens/home/components/Items/AlbumItem'
import ArtistItem from '@/screens/home/components/Items/ArtistItem'
import PlaylistItem from '@/screens/home/components/Items/PlaylistItem'
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
import {
  selectAlbumLastPlayedAt,
  selectAlbumPlays,
  selectArtistLastPlayedAt,
  selectArtistPlays,
} from '@/utils/redux/selectors/statsSelectors'
import { setLibrarySortOrder } from '@/utils/redux/slices/settingsSlice'
import { LIBRARY_INITIAL_PAGE_SIZE, LIBRARY_PAGE_SIZE } from '@/constants/library'

type FilterType = 'albums' | 'artists' | 'playlists' | 'tracks'

export default function CategoryListScreen() {
  const { type } = useLocalSearchParams<{ type: FilterType }>()
  const router = useRouter()
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const { gridItemWidth, gridSpacing } = useGridLayout()

  const { albums, isLoading: albumsLoading } = useAlbums()
  const { artists, isLoading: artistsLoading } = useArtists()
  const { playlists, isLoading: playlistsLoading } = usePlaylists()
  const { tracks, isLoading: tracksLoading } = useTracks()

  const gridColumns = useSelector(selectGridColumns)
  const isGridView = useSelector(selectIsGridView)
  const sortOrder = useSelector(selectLibrarySortOrder)
  const albumPlays = useSelector(selectAlbumPlays)
  const artistPlays = useSelector(selectArtistPlays)
  const albumLastPlayedAt = useSelector(selectAlbumLastPlayedAt)
  const artistLastPlayedAt = useSelector(selectArtistLastPlayedAt)

  const sortSheetRef = useRef<BottomSheetModal>(null)
  const gridSettingsSheetRef = useRef<BottomSheetModal>(null)

  const [displayedCount, setDisplayedCount] = useState(LIBRARY_INITIAL_PAGE_SIZE)

  const isLoading =
    (type === 'albums' && albumsLoading) ||
    (type === 'artists' && artistsLoading) ||
    (type === 'playlists' && playlistsLoading) ||
    (type === 'tracks' && tracksLoading)

  const filteredData = useMemo(() => {
    switch (type) {
      case 'albums':
        return albums.map(a => ({ ...a, type: 'Album' as const }))
      case 'artists':
        return artists.map(a => ({ ...a, type: 'Artist' as const }))
      case 'playlists':
        return playlists.map(p => ({ ...p, type: 'Playlist' as const }))
      case 'tracks':
        return tracks.map(t => ({ ...t, type: 'Track' as const }))
      default:
        return []
    }
  }, [type, albums, artists, playlists, tracks])

  const sortedData = useMemo(() => {
    const data = [...filteredData]
    switch (sortOrder) {
      case 'title':
        data.sort((a, b) => {
          const aTitle = 'title' in a ? a.title : a.name
          const bTitle = 'title' in b ? b.title : b.name
          return aTitle.localeCompare(bTitle)
        })
        break
      case 'recent':
        data.sort((a, b) => {
          const aTime =
            a.type === 'Album'
              ? albumLastPlayedAt[a.id] ?? 0
              : a.type === 'Artist'
              ? artistLastPlayedAt[a.id] ?? 0
              : 0
          const bTime =
            b.type === 'Album'
              ? albumLastPlayedAt[b.id] ?? 0
              : b.type === 'Artist'
              ? artistLastPlayedAt[b.id] ?? 0
              : 0
          return bTime - aTime
        })
        break
      case 'userplays':
        data.sort((a, b) => {
          const aPlays =
            a.type === 'Album'
              ? albumPlays[a.id] ?? 0
              : a.type === 'Artist'
              ? artistPlays[a.id] ?? 0
              : 0
          const bPlays =
            b.type === 'Album'
              ? albumPlays[b.id] ?? 0
              : b.type === 'Artist'
              ? artistPlays[b.id] ?? 0
              : 0
          return bPlays - aPlays
        })
        break
      case 'year':
        data.sort((a, b) => {
          if (a.type !== 'Album' || b.type !== 'Album') return 0
          return (b.year ?? 0) - (a.year ?? 0)
        })
        break
    }
    return data
  }, [filteredData, sortOrder, albumPlays, artistPlays, albumLastPlayedAt, artistLastPlayedAt])

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

  const renderItem = ({ item }: { item: any }) => {
    switch (item.type) {
      case 'Album':
        return (
          <AlbumItem
            {...item}
            isGridView={isGridView}
            gridWidth={gridItemWidth}
            gridSpacing={gridSpacing}
          />
        )
      case 'Artist':
        return (
          <ArtistItem
            {...item}
            isGridView={isGridView}
            gridWidth={gridItemWidth}
            gridSpacing={gridSpacing}
          />
        )
      case 'Playlist':
        return (
          <PlaylistItem
            {...item}
            isGridView={isGridView}
            gridWidth={gridItemWidth}
            gridSpacing={gridSpacing}
          />
        )
      case 'Track':
        return (
          <TrackItem
            song={item}
            isGridView={isGridView}
            gridWidth={gridItemWidth}
            gridSpacing={gridSpacing}
          />
        )
      default:
        return null
    }
  }

  const titleKey =
    type === 'albums'
      ? 'home.filters.albums'
      : type === 'artists'
      ? 'home.filters.artists'
      : type === 'playlists'
      ? 'home.filters.playlists'
      : 'home.filters.tracks'

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
            {t(titleKey)}
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
        estimatedItemSize={type === 'tracks' ? 70 : 302}
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
