import React, { useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '@/hooks/useTheme'
import { useArtists } from '@/hooks/artists'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import * as deezer from '@/api/deezer'
import { QueryKeys } from '@/enums/queryKeys'
import { getExploreDayKey } from '@/features/explore/hooks/useDailyLayout'
import { collectCoveredAlbumsForArtists } from '@/features/explore/utils/albumDiscovery'
import MediaTile from './MediaTile'
import ExploreLoadingTiles from './ExploreLoadingTiles'
import type { ExternalAlbumBase } from '@/types'

const H_PADDING = 16
const VISIBLE_ITEMS = 2.5
const MIN_ALBUMS = 8
const TARGET_ALBUMS = 10
const RELATED_ARTIST_LIMIT = 40

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
  const dayKey = getExploreDayKey()
  const libraryArtistNames = useMemo(
    () => new Set(libraryArtists.map(artist => artist.name.toLowerCase())),
    [libraryArtists]
  )
  const libraryArtistKey = useMemo(
    () => [...libraryArtistNames].sort().join('|'),
    [libraryArtistNames]
  )

  const screenWidth = Dimensions.get('window').width
  const gridGap = 12
  const gridItemWidth = (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS

  const query = useQuery<ExternalAlbumBase[]>({
    queryKey: [QueryKeys.ExploreBecauseYouListened, dayKey, artistName, libraryArtistKey],
    queryFn: () => fetchAlbumsForSeed(artistName, libraryArtistNames),
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

  if (!query.isLoading && albums.length < MIN_ALBUMS) return null

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]} numberOfLines={1}>
        {t('explore.sections.becauseYouListened', { artist: artistName })}
      </Text>
      {query.isLoading ? (
        <ExploreLoadingTiles
          itemSize={gridItemWidth}
          gap={gridGap}
          horizontalPadding={H_PADDING}
          variant="album"
        />
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
  )
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    marginLeft: H_PADDING,
    marginRight: H_PADDING,
  },
  titleDark: {
    color: '#fff',
  },
})
