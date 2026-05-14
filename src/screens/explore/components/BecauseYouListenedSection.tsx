import React, { useCallback, useMemo, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useTheme } from '@/hooks/useTheme'
import { useArtists } from '@/hooks/artists'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import { mmkv } from '@/utils/mmkvStorage'
import { useDeezerEnabled } from '@/features/explore/hooks/useDeezerEnabled'
import * as deezer from '@/api/deezer'
import { QueryKeys } from '@/enums/queryKeys'
import { getExploreDayKey } from '@/features/explore/hooks/useDailyLayout'
import { collectCoveredAlbumsForArtists } from '@/features/explore/utils/albumDiscovery'
import SelectionBottomSheet from '@/components/SelectionBottomSheet'
import MediaTile from './MediaTile'
import ExploreLoadingTiles from './ExploreLoadingTiles'
import type { ExternalAlbumBase } from '@/types'

const H_PADDING = 16
const VISIBLE_ITEMS = 2.5
const MIN_ALBUMS = 8
const TARGET_ALBUMS = 10
const RELATED_ARTIST_LIMIT = 40
const STORAGE_KEY = 'explore:becauseArtist'

async function fetchAlbumsForSeed(
  artistName: string,
  libraryArtistNames: Set<string>
): Promise<ExternalAlbumBase[]> {
  const seedArtist = await deezer.resolveDeezerArtistByName(artistName)
  if (!seedArtist) return []

  const related = await deezer.getDeezerRelatedArtists(seedArtist.id, RELATED_ARTIST_LIMIT)
  const fresh = related.filter(artist => !libraryArtistNames.has(artist.name.toLowerCase()))

  return collectCoveredAlbumsForArtists(fresh, { targetAlbums: TARGET_ALBUMS })
}

type Props = {
  artistName: string
}

export default function BecauseYouListenedSection({ artistName }: Props) {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const { artists: libraryArtists } = useArtists()
  const sheetRef = useRef<BottomSheetModal>(null)
  const dayKey = getExploreDayKey()
  const isEnabled = useDeezerEnabled()

  const [selectedArtist, setSelectedArtist] = React.useState<string>(
    () => mmkv.getString(STORAGE_KEY) ?? artistName
  )

  const artistNames = useMemo(
    () =>
      [...new Set(
        libraryArtists
          .filter(a => a.name.trim() && a.name.toLowerCase() !== 'various artists')
          .map(a => a.name)
      )].sort(),
    [libraryArtists]
  )

  const libraryArtistNames = useMemo(
    () => new Set(libraryArtists.map(a => a.name.toLowerCase())),
    [libraryArtists]
  )

  const handleSelect = useCallback((value: string) => {
    setSelectedArtist(value)
    mmkv.set(STORAGE_KEY, value)
    sheetRef.current?.dismiss()
  }, [])

  const handleRandomize = useCallback(() => {
    const eligible = artistNames.filter(n => n !== selectedArtist)
    const pool = eligible.length > 0 ? eligible : artistNames
    const random = pool[Math.floor(Math.random() * pool.length)]
    if (random) {
      setSelectedArtist(random)
      mmkv.set(STORAGE_KEY, random)
    }
    sheetRef.current?.dismiss()
  }, [artistNames, selectedArtist])

  const screenWidth = Dimensions.get('window').width
  const gridGap = 12
  const gridItemWidth = (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS

  const query = useQuery<ExternalAlbumBase[]>({
    queryKey: [QueryKeys.ExploreBecauseYouListened, dayKey, selectedArtist],
    queryFn: () => fetchAlbumsForSeed(selectedArtist, libraryArtistNames),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 60 * 12,
    networkMode: 'online',
  })

  const albums = useMemo(() => query.data ?? [], [query.data])
  const coversToPrefetch = useMemo(() => albums.map(a => a.cover), [albums])
  usePrefetchCovers(coversToPrefetch, 'grid')

  const renderAlbum = useCallback(({ item }: { item: ExternalAlbumBase }) => (
    <MediaTile
      cover={item.cover}
      title={item.title}
      subtitle={item.subtext}
      size={gridItemWidth}
      radius={6}
      onPress={() => {
        prefetchCovers([item.cover], 'detail')
        navigation.navigate('externalAlbumView', {
          source: item.externalSource,
          albumId: item.id,
        })
      }}
    />
  ), [navigation, gridItemWidth])

  const isEmpty = !query.isLoading && albums.length === 0

  return (
    <>
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Text style={[styles.titlePrefix, isDarkMode && styles.titlePrefixDark]}>
            {t('explore.sections.becauseYouListenedLabel')}
          </Text>
          <TouchableOpacity
            onPress={() => sheetRef.current?.present()}
            hitSlop={8}
          >
            <Text
              style={[styles.artistName, isDarkMode && styles.artistNameDark]}
              numberOfLines={1}
            >
              {selectedArtist}
            </Text>
          </TouchableOpacity>
        </View>

        {query.isLoading ? (
          <ExploreLoadingTiles
            itemSize={gridItemWidth}
            gap={gridGap}
            horizontalPadding={H_PADDING}
            variant="album"
          />
        ) : isEmpty ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
              No results — try a different artist
            </Text>
          </View>
        ) : (
          <FlashList
            horizontal
            data={albums}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: H_PADDING }}
            ItemSeparatorComponent={() => <View style={{ width: gridGap }} />}
            renderItem={renderAlbum}
          />
        )}
      </View>

      <SelectionBottomSheet
        ref={sheetRef}
        items={artistNames}
        onSelect={handleSelect}
        onRandomize={handleRandomize}
        placeholder={t('explore.sections.searchArtists')}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 12,
    marginLeft: H_PADDING,
    marginRight: H_PADDING,
  },
  titlePrefix: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  titlePrefixDark: {
    color: '#fff',
  },
  artistName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    borderBottomWidth: 1.5,
    borderBottomColor: '#000',
    paddingBottom: 1,
  },
  artistNameDark: {
    color: '#fff',
    borderBottomColor: '#fff',
  },
  emptyState: {
    paddingHorizontal: H_PADDING,
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#aaa',
  },
  emptyTextDark: {
    color: '#555',
  },
})
