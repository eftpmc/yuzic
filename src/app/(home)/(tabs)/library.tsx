import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { FlashList } from '@shopify/flash-list'
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS, Easing } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { useTranslation } from 'react-i18next'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
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
import type { Album, Artist, Playlist, SongBase } from '@/types'

import HomeHeader from '@/screens/home/components/Header'
import AccountBottomSheet from '@/screens/home/components/AccountBottomSheet'
import AlbumItem from '@/screens/home/components/Items/AlbumItem'
import ArtistItem from '@/screens/home/components/Items/ArtistItem'
import PlaylistItem from '@/screens/home/components/Items/PlaylistItem'
import TrackItem from '@/screens/home/components/Items/TrackItem'
import { FilterPill } from '@/screens/home/components/Filters/FilterPill'
import SortBottomSheet from '@/screens/home/components/SortBottomSheet'
import GridSettingsBottomSheet from '@/screens/home/components/GridSettingsBottomSheet'

type Filter = 'playlists' | 'albums' | 'artists' | 'tracks' | 'downloaded' | null
type SortOrder = 'title' | 'recent' | 'userplays' | 'year'

type LibraryItem =
  | { kind: 'album'; data: Album }
  | { kind: 'artist'; data: Artist }
  | { kind: 'playlist'; data: Playlist }
  | { kind: 'track'; data: SongBase }

const LIST_PADDING = 12

const collator = new Intl.Collator(undefined, { sensitivity: 'base' })

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
      const aName = a.kind === 'artist' ? a.data.name : (a.data as any).title ?? ''
      const bName = b.kind === 'artist' ? b.data.name : (b.data as any).title ?? ''
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
        if (x.kind === 'playlist') return (x.data as any).changed ? new Date((x.data as any).changed).getTime() : 0
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
    return 0
  })
}

export default function LibraryScreen() {
  const navigation = useNavigation()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
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

  const accountSheetRef = useRef<BottomSheetModal>(null)
  const sortSheetRef = useRef<BottomSheetModal>(null)
  const gridSheetRef = useRef<BottomSheetModal>(null)

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
  const { isTrackDownloaded } = useDownload()

  const screenWidth = Dimensions.get('window').width
  const gridWidth = (screenWidth - LIST_PADDING * 2 - (gridColumns + 1) * gridSpacing) / gridColumns

  const stats = useMemo<SortStats>(
    () => ({ songLastPlayed, songPlays, albumLastPlayed, albumPlays, artistLastPlayed, artistPlays }),
    [songLastPlayed, songPlays, albumLastPlayed, albumPlays, artistLastPlayed, artistPlays],
  )

  const sortedAll = useMemo(() => sortItems([
    ...playlists.map(p => ({ kind: 'playlist' as const, data: p })),
    ...albums.map(a => ({ kind: 'album' as const, data: a })),
    ...artists.map(a => ({ kind: 'artist' as const, data: a })),
  ], sortOrder, stats), [sortOrder, stats, albums, artists, playlists])

  const sortedByFilter = useMemo(() => ({
    playlists:  sortItems(playlists.map(p => ({ kind: 'playlist'  as const, data: p })), sortOrder, stats),
    albums:     sortItems(albums.map(a => ({ kind: 'album'        as const, data: a })), sortOrder, stats),
    artists:    sortItems(artists.map(a => ({ kind: 'artist'       as const, data: a })), sortOrder, stats),
    tracks:     sortItems(tracks.map(tr => ({ kind: 'track'        as const, data: tr })), sortOrder, stats),
    downloaded: sortItems(tracks.filter(tr => isTrackDownloaded(tr.id)).map(tr => ({ kind: 'track' as const, data: tr })), sortOrder, stats),
  }), [sortOrder, stats, albums, artists, playlists, tracks, isTrackDownloaded])

  const items = useMemo(
    () => listFilter ? sortedByFilter[listFilter] : sortedAll,
    [listFilter, sortedAll, sortedByFilter],
  )

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
  }, [isAccountSheetOpen])

  const FILTERS = useMemo(() => [
    { value: 'playlists'  as const, label: t('home.filters.playlists') },
    { value: 'albums'     as const, label: t('home.filters.albums') },
    { value: 'artists'    as const, label: t('home.filters.artists') },
    { value: 'tracks'     as const, label: t('home.filters.tracks') },
    { value: 'downloaded' as const, label: t('home.filters.downloaded') },
  ], [t])

  const SORT_LABELS = useMemo((): Record<SortOrder, string> => ({
    recent:    t('home.sort.mostRecent'),
    title:     t('home.sort.alphabetical'),
    year:      t('home.sort.releaseYear'),
    userplays: t('home.sort.mostPlayed'),
  }), [t])

  const secondaryColor = isDarkMode ? '#aaa' : '#666'
  const titleColor = isDarkMode ? '#e6e6e6' : '#000'
  const borderColor = isDarkMode ? '#1C1C1E' : '#D1D1D6'
  const activeTextColor = isDarkMode ? '#000' : '#fff'

  const renderItem = useCallback(({ item }: { item: LibraryItem }) => {
    switch (item.kind) {
      case 'album':
        return (
          <AlbumItem
            id={item.data.id}
            title={item.data.title}
            subtext={item.data.subtext}
            cover={item.data.cover}
            isGridView={isGridView}
            gridWidth={gridWidth}
            gridSpacing={gridSpacing}
            serverId={activeServer?.id}
          />
        )
      case 'artist':
        return (
          <ArtistItem
            id={item.data.id}
            name={item.data.name}
            subtext={item.data.subtext}
            cover={item.data.cover}
            isGridView={isGridView}
            gridWidth={gridWidth}
            gridSpacing={gridSpacing}
            serverId={activeServer?.id}
          />
        )
      case 'playlist':
        return (
          <PlaylistItem
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
      edges={['top']}
      style={[styles.container, isDarkMode && styles.containerDark]}
    >
      <HomeHeader
        title="yuzic"
        username={username}
        onSearch={() => (navigation as any).navigate('search')}
        onAccountPress={toggleAccountSheet}
      />

      <View style={[styles.filterRow, { borderBottomColor: borderColor, backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
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
              inactiveBackgroundColor={isDarkMode ? '#1C1C1E' : '#F2F2F7'}
              activeTextColor={activeTextColor}
              inactiveTextColor={secondaryColor}
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
      <FlashList
        key={`${isGridView ? `grid-${gridColumns}` : 'list'}`}
        data={items}
        keyExtractor={item => `${item.kind}-${item.data.id}`}
        renderItem={renderItem}
        numColumns={isGridView ? gridColumns : 1}
        estimatedItemSize={isGridView ? gridWidth + 30 : 64}
        getItemType={item => item.kind}
        ListHeaderComponent={
          <View style={[styles.sortRow, { borderBottomColor: borderColor, backgroundColor: isDarkMode ? '#000' : '#fff' }]}>
            <TouchableOpacity
              style={styles.sortButton}
              onPress={() => sortSheetRef.current?.present()}
            >
              <ArrowUpDown size={17} color={titleColor} />
              <Text style={[styles.sortLabel, { color: titleColor }]}>
                {SORT_LABELS[sortOrder]}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.gridButton}
              onPress={() => gridSheetRef.current?.present()}
            >
              {isGridView
                ? <List size={17} color={titleColor} />
                : <Grid2x2 size={17} color={titleColor} />
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
    backgroundColor: '#fff',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  filterRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
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
