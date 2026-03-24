import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated'
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

function sortItems(items: LibraryItem[], order: SortOrder): LibraryItem[] {
  if (order === 'userplays') return items
  return [...items].sort((a, b) => {
    if (order === 'title') {
      const aName = a.kind === 'artist' ? a.data.name : (a.data as any).title ?? ''
      const bName = b.kind === 'artist' ? b.data.name : (b.data as any).title ?? ''
      return aName.localeCompare(bName)
    }
    if (order === 'year') {
      const aY = a.kind === 'album' ? (a.data.year ?? 0) : 0
      const bY = b.kind === 'album' ? (b.data.year ?? 0) : 0
      return bY - aY
    }
    if (order === 'recent') {
      const toMs = (d: any) => d ? new Date(d).getTime() : 0
      const aD =
        a.kind === 'album' ? toMs(a.data.created) :
        a.kind === 'playlist' ? toMs(a.data.changed) : 0
      const bD =
        b.kind === 'album' ? toMs(b.data.created) :
        b.kind === 'playlist' ? toMs(b.data.changed) : 0
      return bD - aD
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
  const [sortOrder, setSortOrder] = useState<SortOrder>('title')

  const listOpacity = useSharedValue(1)
  const animatedListStyle = useAnimatedStyle(() => ({ opacity: listOpacity.value }))
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false)
  const isMounted = useRef(false)

  const accountSheetRef = useRef<BottomSheetModal>(null)
  const sortSheetRef = useRef<BottomSheetModal>(null)
  const gridSheetRef = useRef<BottomSheetModal>(null)

  const { albums } = useAlbums()
  const { artists } = useArtists()
  const { playlists } = usePlaylists()
  const { tracks } = useTracks()
  const { isTrackDownloaded } = useDownload()

  const screenWidth = Dimensions.get('window').width
  const gridWidth = (screenWidth - LIST_PADDING * 2 - (gridColumns + 1) * gridSpacing) / gridColumns

  useEffect(() => {
    if (!isMounted.current) { isMounted.current = true; return }
    const raf = requestAnimationFrame(() => {
      listOpacity.value = withTiming(1, { duration: 150 })
    })
    return () => cancelAnimationFrame(raf)
  }, [listFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo((): LibraryItem[] => {
    let raw: LibraryItem[]
    if (!listFilter) {
      raw = [
        ...playlists.map(p => ({ kind: 'playlist' as const, data: p })),
        ...albums.map(a => ({ kind: 'album' as const, data: a })),
        ...artists.map(a => ({ kind: 'artist' as const, data: a })),
        ...tracks.map(tr => ({ kind: 'track' as const, data: tr })),
      ]
    } else switch (listFilter) {
      case 'playlists':
        raw = playlists.map(p => ({ kind: 'playlist', data: p }))
        break
      case 'albums':
        raw = albums.map(a => ({ kind: 'album', data: a }))
        break
      case 'artists':
        raw = artists.map(a => ({ kind: 'artist', data: a }))
        break
      case 'tracks':
        raw = tracks.map(tr => ({ kind: 'track', data: tr }))
        break
      case 'downloaded':
        raw = tracks.filter(tr => isTrackDownloaded(tr.id)).map(tr => ({ kind: 'track', data: tr }))
        break
    }
    return sortItems(raw, sortOrder)
  }, [listFilter, sortOrder, albums, artists, playlists, tracks, isTrackDownloaded])

  const handleFilterPress = (val: NonNullable<Filter>) => {
    const newFilter = filter === val ? null : val
    setFilter(newFilter)
    listOpacity.value = withTiming(0, { duration: 150 }, (finished) => {
      'worklet'
      if (finished) runOnJS(setListFilter)(newFilter)
    })
  }

  const toggleAccountSheet = () => {
    if (isAccountSheetOpen) {
      accountSheetRef.current?.dismiss()
    } else {
      setIsAccountSheetOpen(true)
      accountSheetRef.current?.present()
    }
  }

  const FILTERS: { value: NonNullable<Filter>; label: string }[] = [
    { value: 'playlists',  label: t('home.filters.playlists') },
    { value: 'albums',     label: t('home.filters.albums') },
    { value: 'artists',    label: t('home.filters.artists') },
    { value: 'tracks',     label: t('home.filters.tracks') },
    { value: 'downloaded', label: t('home.filters.downloaded') },
  ]

  const SORT_LABELS: Record<SortOrder, string> = {
    title:     t('home.sort.alphabetical'),
    year:      t('home.sort.releaseYear'),
    userplays: t('home.sort.mostPlayed'),
    recent:    t('home.sort.mostRecent'),
  }

  const secondaryColor = isDarkMode ? '#aaa' : '#666'
  const titleColor = isDarkMode ? '#e6e6e6' : '#000'

const borderColor = isDarkMode ? '#1C1C1E' : '#D1D1D6'
  const activeTextColor = isDarkMode ? '#000' : '#fff'

  const renderItem = ({ item }: { item: LibraryItem }) => {
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
  }

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
          contentContainerStyle={styles.filterScroll}
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
              onPress={handleFilterPress}
            />
          ))}
        </ScrollView>
      </View>

      <Animated.View style={[{ flex: 1 }, animatedListStyle]}>
        <FlatList
          key={isGridView ? `grid-${gridColumns}` : 'list'}
          data={items}
          keyExtractor={item => `${item.kind}-${item.data.id}`}
          renderItem={renderItem}
          numColumns={isGridView ? gridColumns : 1}
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
  filterScroll: {
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
