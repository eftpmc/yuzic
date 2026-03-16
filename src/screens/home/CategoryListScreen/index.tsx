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
import { useFullPlaylists, usePlaylists } from '@/hooks/playlists'
import { useTracks } from '@/hooks/tracks'
import { useDownloadedTracks } from 'react-native-nitro-player'
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
  selectOfflineModeEnabled,
} from '@/utils/redux/selectors/settingsSelectors'
import {
  selectAlbumLastPlayedAt,
  selectAlbumPlays,
  selectArtistLastPlayedAt,
  selectArtistPlays,
} from '@/utils/redux/selectors/statsSelectors'
import { setLibrarySortOrder } from '@/utils/redux/slices/settingsSlice'
import { LIBRARY_INITIAL_PAGE_SIZE, LIBRARY_PAGE_SIZE } from '@/constants/library'
import { getFullyDownloadedAlbumIds, isPlaylistFullyDownloaded } from '@/utils/downloads/collectionState'

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
  const { playlists: fullPlaylists } = useFullPlaylists(playlists)
  const { tracks, isLoading: tracksLoading } = useTracks()
  const { isTrackDownloaded } = useDownloadedTracks()

  const gridColumns = useSelector(selectGridColumns)
  const isGridView = useSelector(selectIsGridView)
  const sortOrder = useSelector(selectLibrarySortOrder)
  const offlineModeEnabled = useSelector(selectOfflineModeEnabled)
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

  const downloadedTracks = useMemo(
    () => tracks.filter(t => isTrackDownloaded(t.id)),
    [tracks, isTrackDownloaded]
  )
  const downloadedTrackIds = useMemo(
    () => new Set(downloadedTracks.map(t => t.id)),
    [downloadedTracks]
  )
  const downloadedAlbumIds = useMemo(
    () => getFullyDownloadedAlbumIds(tracks, downloadedTrackIds),
    [tracks, downloadedTrackIds]
  )
  const downloadedPlaylistIds = useMemo(
    () =>
      new Set(
        fullPlaylists
          .filter(p => isPlaylistFullyDownloaded(p, downloadedTrackIds))
          .map(p => p.id)
      ),
    [fullPlaylists, downloadedTrackIds]
  )

  const filteredData = useMemo(() => {
    switch (type) {
      case 'albums': {
        const source = offlineModeEnabled
          ? albums.filter(a => downloadedAlbumIds.has(a.id))
          : albums
        return source.map(a => ({ ...a, type: 'Album' as const }))
      }
      case 'artists':
        return artists.map(a => ({ ...a, type: 'Artist' as const }))
      case 'playlists': {
        const source = offlineModeEnabled
          ? playlists.filter(p => downloadedPlaylistIds.has(p.id))
          : playlists
        return source.map(p => ({ ...p, type: 'Playlist' as const }))
      }
      case 'tracks': {
        const source = offlineModeEnabled ? downloadedTracks : tracks
        return source.map(t => ({ ...t, type: 'Track' as const }))
      }
      default:
        return []
    }
  }, [type, albums, artists, playlists, tracks, offlineModeEnabled, downloadedAlbumIds, downloadedPlaylistIds, downloadedTracks])

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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={isDarkMode ? '#fff' : '#000'} />
        </TouchableOpacity>
        <View pointerEvents="none" style={styles.titleWrapper}>
          <Text style={[styles.title, isDarkMode && styles.titleDark]}>
            {t(titleKey)}
          </Text>
        </View>
        <View style={styles.backButton} />
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
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  titleDark: {
    color: '#fff',
  },
})
