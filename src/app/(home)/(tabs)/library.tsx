import React, { useCallback, useMemo, useState } from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { ArrowUpDown, Grid2x2, List } from 'lucide-react-native'

import { useAlbums } from '@/hooks/albums'
import { useArtists } from '@/hooks/artists'
import { usePlaylists } from '@/hooks/playlists'
import { useTracks } from '@/hooks/tracks'
import { useTheme } from '@/hooks/useTheme'
import { useDownload } from '@/contexts/DownloadContext'
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors'
import {
  selectThemeColor,
  selectIsGridView,
  selectGridColumns,
  selectGridSpacing,
} from '@/utils/redux/selectors/settingsSelectors'
import {
  selectSongLastPlayedAt,
  selectSongPlayCounts,
  selectAlbumLastPlayedAt,
  selectAlbumPlayCounts,
  selectArtistLastPlayedAt,
  selectArtistPlayCounts,
} from '@/utils/redux/selectors/statsSelectors'
import type { AlbumBase, Artist, PlaylistBase, SongBase } from '@/types'

import HomeHeader from '@/screens/library/components/Header'
import AccountBottomSheet from '@/screens/library/components/AccountBottomSheet'
import AlbumItem from '@/screens/library/components/Items/AlbumItem'
import ArtistItem from '@/screens/library/components/Items/ArtistItem'
import PlaylistItem from '@/screens/library/components/Items/PlaylistItem'
import TrackItem from '@/screens/library/components/Items/TrackItem'
import { FilterPill } from '@/screens/library/components/Filters/FilterPill'
import SortBottomSheet from '@/screens/library/components/SortBottomSheet'
import GridSettingsBottomSheet from '@/screens/library/components/GridSettingsBottomSheet'
import { useSheetRef } from '@/utils/useSheetRef'

type Filter = 'playlists' | 'albums' | 'artists' | 'tracks' | 'downloaded' | null
type SortOrder = 'title' | 'recent' | 'userplays' | 'year' | 'recentlyAdded'

type LibraryItem =
  | { kind: 'album'; data: AlbumBase }
  | { kind: 'artist'; data: Artist }
  | { kind: 'playlist'; data: PlaylistBase }
  | { kind: 'track'; data: SongBase }

const LIST_PADDING = 12

const collator = new Intl.Collator(undefined, { sensitivity: 'base' })

// Stable empty stats used for sort orders that don't need play data (title, year,
// recentlyAdded). Keeps a constant reference so sortedAll / items don't recompute
// on every play count change when the user is on a non-stats sort.
const EMPTY_SORT_STATS: SortStats = {
  songLastPlayed: {},
  songPlays: {},
  albumLastPlayed: {},
  albumPlays: {},
  artistLastPlayed: {},
  artistPlays: {},
}

type StatsMap = Record<string, number>

interface SortStats {
  songLastPlayed: StatsMap
  songPlays: StatsMap
  albumLastPlayed: StatsMap
  albumPlays: StatsMap
  artistLastPlayed: StatsMap
  artistPlays: StatsMap
}

function sortItems(items: LibraryItem[], order: SortOrder, stats: SortStats): LibraryItem[] {
  return [...items].sort((a, b) => {
    if (order === 'title') {
      const aName = a.kind === 'artist' ? a.data.name : a.data.title
      const bName = b.kind === 'artist' ? b.data.name : b.data.title
      return collator.compare(aName, bName)
    }
    if (order === 'year') {
      const getYear = (x: LibraryItem) => {
        if (x.kind === 'album') return x.data.year ?? 0
        if (x.kind === 'track') return x.data.year ?? 0
        return 0
      }
      return getYear(b) - getYear(a)
    }
    if (order === 'recent') {
      const getMs = (x: LibraryItem): number => {
        if (x.kind === 'album') return stats.albumLastPlayed[x.data.id] ?? 0
        if (x.kind === 'track') return stats.songLastPlayed[x.data.id] ?? 0
        if (x.kind === 'artist') return stats.artistLastPlayed[x.data.id] ?? 0
        if (x.kind === 'playlist') return x.data.changed ? new Date(x.data.changed).getTime() : 0
        return 0
      }
      return getMs(b) - getMs(a)
    }
    if (order === 'userplays') {
      const getPlays = (x: LibraryItem) => {
        if (x.kind === 'track') return stats.songPlays[x.data.id] ?? 0
        if (x.kind === 'album') return stats.albumPlays[x.data.id] ?? 0
        if (x.kind === 'artist') return stats.artistPlays[x.data.id] ?? 0
        return 0
      }
      return getPlays(b) - getPlays(a)
    }
    if (order === 'recentlyAdded') {
      const getCreated = (x: LibraryItem): number => {
        if (x.kind === 'album' || x.kind === 'playlist') return x.data.created ? new Date(x.data.created).getTime() : 0
        if (x.kind === 'track') return x.data.dateAdded ? new Date(x.data.dateAdded).getTime() : 0
        return 0
      }
      return getCreated(b) - getCreated(a)
    }
    return 0
  })
}

export default function LibraryScreen() {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { colors } = useTheme()
  const themeColor = useSelector(selectThemeColor)
  const isGridView = useSelector(selectIsGridView)
  const gridColumns = useSelector(selectGridColumns)
  const gridSpacing = useSelector(selectGridSpacing)
  const activeServer = useSelector(selectActiveServer)
  const username = activeServer?.username

  const [filter, setFilter] = useState<Filter>(null)
  const [listFilter, setListFilter] = useState<Filter>(null)
  const [sortOrder, setSortOrder] = useState<SortOrder>('recent')
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false)

  const listOpacity = useSharedValue(1)
  const animatedListStyle = useAnimatedStyle(() => ({ opacity: listOpacity.value }))

  const accountSheetRef = useSheetRef()
  const sortSheetRef = useSheetRef()
  const gridSheetRef = useSheetRef()

  const songLastPlayed = useSelector(selectSongLastPlayedAt)
  const songPlays = useSelector(selectSongPlayCounts)
  const albumLastPlayed = useSelector(selectAlbumLastPlayedAt)
  const albumPlays = useSelector(selectAlbumPlayCounts)
  const artistLastPlayed = useSelector(selectArtistLastPlayedAt)
  const artistPlays = useSelector(selectArtistPlayCounts)

  const { albums } = useAlbums()
  const { artists } = useArtists()
  const { playlists } = usePlaylists()
  const { tracks } = useTracks()
  const { getAllDownloadedCollections } = useDownload()

  const { width: screenWidth } = useWindowDimensions()
  const gridWidth = (screenWidth - LIST_PADDING * 2 - (gridColumns + 1) * gridSpacing) / gridColumns

  const stats = useMemo<SortStats>(
    () => ({ songLastPlayed, songPlays, albumLastPlayed, albumPlays, artistLastPlayed, artistPlays }),
    [songLastPlayed, songPlays, albumLastPlayed, albumPlays, artistLastPlayed, artistPlays],
  )

  // For sort orders that don't use play data, use the stable empty constant so that
  // sortedAll and items don't recompute every time a song is played.
  const statsForSort = (sortOrder === 'recent' || sortOrder === 'userplays') ? stats : EMPTY_SORT_STATS

  const sortedAll = useMemo(() => sortItems([
    ...playlists.map(p => ({ kind: 'playlist' as const, data: p })),
    ...albums.map(a => ({ kind: 'album' as const, data: a })),
    ...artists.map(a => ({ kind: 'artist' as const, data: a })),
  ], sortOrder, statsForSort), [sortOrder, statsForSort, albums, artists, playlists])

  const downloadedCollectionIds = useMemo(() => {
    const ids = new Set<string>()
    getAllDownloadedCollections().forEach(c => ids.add(c.id))
    return ids
  }, [getAllDownloadedCollections])

  const items = useMemo(() => {
    if (!listFilter) return sortedAll
    switch (listFilter) {
      case 'playlists':
        return sortItems(playlists.map(p => ({ kind: 'playlist' as const, data: p })), sortOrder, statsForSort)
      case 'albums':
        return sortItems(albums.map(a => ({ kind: 'album' as const, data: a })), sortOrder, statsForSort)
      case 'artists':
        return sortItems(artists.map(a => ({ kind: 'artist' as const, data: a })), sortOrder, statsForSort)
      case 'tracks':
        return sortItems(tracks.map(tr => ({ kind: 'track' as const, data: tr })), sortOrder, statsForSort)
      case 'downloaded':
        return sortItems([
          ...albums.filter(a => downloadedCollectionIds.has(a.id)).map(a => ({ kind: 'album' as const, data: a })),
          ...playlists.filter(p => downloadedCollectionIds.has(p.id)).map(p => ({ kind: 'playlist' as const, data: p })),
        ], sortOrder, statsForSort)
    }
  }, [listFilter, sortedAll, sortOrder, statsForSort, albums, artists, playlists, tracks, downloadedCollectionIds])

  const applyFilterAndFadeIn = useCallback((newFilter: Filter) => {
    setListFilter(newFilter)
    requestAnimationFrame(() => {
      listOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.ease) })
    })
  }, [listOpacity])

  const toggleAccountSheet = useCallback(() => {
    if (isAccountSheetOpen) {
      accountSheetRef.current?.dismiss()
    } else {
      setIsAccountSheetOpen(true)
      accountSheetRef.current?.present()
    }
  }, [accountSheetRef, isAccountSheetOpen])

  const FILTERS = useMemo(() => [
    { value: 'playlists'  as const, label: t('home.filters.playlists') },
    { value: 'albums'     as const, label: t('home.filters.albums') },
    { value: 'artists'    as const, label: t('home.filters.artists') },
    { value: 'tracks'     as const, label: t('home.filters.tracks') },
    { value: 'downloaded' as const, label: t('home.filters.downloaded') },
  ], [t])

  const SORT_LABELS = useMemo((): Record<SortOrder, string> => ({
    recent:        t('home.sort.mostRecent'),
    recentlyAdded: t('home.sort.recentlyAdded'),
    title:         t('home.sort.alphabetical'),
    year:          t('home.sort.releaseYear'),
    userplays:     t('home.sort.mostPlayed'),
  }), [t])

  const activeTextColor = colors.background

  const renderItem = useCallback(({ item }: { item: LibraryItem }) => {
    switch (item.kind) {
      case 'album':
        return (
          <AlbumItem
            album={item.data}
            isGridView={isGridView}
            gridWidth={gridWidth}
            gridSpacing={gridSpacing}
          />
        )
      case 'artist':
        return (
          <ArtistItem
            artist={item.data}
            id={item.data.id}
            name={item.data.name}
            subtext={item.data.subtext}
            cover={item.data.cover}
            isGridView={isGridView}
            gridWidth={gridWidth}
            gridSpacing={gridSpacing}
          />
        )
      case 'playlist':
        return (
          <PlaylistItem
            playlist={item.data}
            id={item.data.id}
            title={item.data.title}
            subtext={item.data.subtext}
            cover={item.data.cover}
            isGridView={isGridView}
            gridWidth={gridWidth}
            gridSpacing={gridSpacing}
          />
        )
      case 'track':
        return (
          <TrackItem
            song={item.data}
            isGridView={isGridView}
            gridWidth={gridWidth}
            gridSpacing={gridSpacing}
          />
        )
    }
  }, [isGridView, gridWidth, gridSpacing])

  return (
    <SafeAreaView
      testID="library-screen"
      edges={['top']}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <HomeHeader
        title="yuzic"
        username={username}
        onSearch={() => (navigation as any).navigate('search')}
        onAccountPress={toggleAccountSheet}
      />

      <View style={[styles.filterRow, { backgroundColor: colors.background }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
        >
          {FILTERS.map(f => (
            <FilterPill
              key={f.value}
              label={f.label}
              value={f.value}
              active={filter === f.value}
              activeBackgroundColor={themeColor}
              inactiveBackgroundColor={colors.muted}
              activeTextColor={activeTextColor}
              inactiveTextColor={colors.subtext}
              onPress={(val) => {
                const newFilter = filter === val ? null : val
                setFilter(newFilter)
                listOpacity.value = withTiming(0, { duration: 120, easing: Easing.in(Easing.ease) }, (finished) => {
                  'worklet'
                  if (finished) runOnJS(applyFilterAndFadeIn)(newFilter)
                })
              }}
            />
          ))}
        </ScrollView>
      </View>

      <Animated.View style={[{ flex: 1 }, animatedListStyle]}>
      <FlashList<LibraryItem>
        key={`${isGridView ? `grid-${gridColumns}` : 'list'}`}
        data={items}
        keyExtractor={item => `${item.kind}-${item.data.id}`}
        renderItem={renderItem}
        numColumns={isGridView ? gridColumns : 1}
        getItemType={item => item.kind}
        ListHeaderComponent={
          <View style={[styles.sortRow, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => sortSheetRef.current?.present()}
            >
              <ArrowUpDown size={17} color={colors.secondary} />
              <Text style={[styles.sortLabel, { color: colors.secondary }]}>
                {SORT_LABELS[sortOrder]}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.gridButton}
              onPress={() => gridSheetRef.current?.present()}
            >
              {isGridView
                ? <List size={17} color={colors.secondary} />
                : <Grid2x2 size={17} color={colors.secondary} />
              }
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={[
          styles.list,
          isGridView && { paddingHorizontal: LIST_PADDING },
          { paddingBottom: 180 },
        ]}
        showsVerticalScrollIndicator={false}
      />
      </Animated.View>

      <AccountBottomSheet
        ref={accountSheetRef}
        onDismiss={() => setIsAccountSheetOpen(false)}
      />

      <SortBottomSheet
        ref={sortSheetRef}
        sortOrder={sortOrder}
        onSelect={setSortOrder}
      />

      <GridSettingsBottomSheet ref={gridSheetRef} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterRow: {},
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    gap: 4,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
    paddingVertical: 8,
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
  list: {
    paddingVertical: 8,
    paddingHorizontal: LIST_PADDING,
  },
})
