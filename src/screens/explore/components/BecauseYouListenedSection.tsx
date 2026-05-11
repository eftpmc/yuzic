import React, { useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '@/hooks/useTheme'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import * as deezer from '@/api/deezer'
import { QueryKeys } from '@/enums/queryKeys'
import MediaTile from './MediaTile'
import ExploreLoadingTiles from './ExploreLoadingTiles'
import type { ExternalAlbumBase } from '@/types'

const H_PADDING = 16
const VISIBLE_ITEMS = 2.5
const TARGET_ALBUMS = 10

async function fetchAlbumsForSeed(artistName: string): Promise<ExternalAlbumBase[]> {
  const seedArtist = await deezer.resolveDeezerArtistByName(artistName)
  if (!seedArtist) return []

  const related = await deezer.getDeezerRelatedArtists(seedArtist.id, TARGET_ALBUMS + 5)

  const results = await Promise.allSettled(
    related.map(async artist => {
      const albums = await deezer.getDeezerArtistAlbums(artist.id, 3, artist)
      return albums.find(a => a.cover.kind !== 'none') ?? null
    })
  )

  const albums: ExternalAlbumBase[] = []
  for (const r of results) {
    if (albums.length >= TARGET_ALBUMS) break
    if (r.status === 'fulfilled' && r.value) albums.push(r.value)
  }

  return albums
}

type Props = {
  artistName: string
}

export default function BecauseYouListenedSection({ artistName }: Props) {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()

  const screenWidth = Dimensions.get('window').width
  const gridGap = 12
  const gridItemWidth = (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS

  const query = useQuery<ExternalAlbumBase[]>({
    queryKey: [QueryKeys.ExploreBecauseYouListened, artistName],
    queryFn: () => fetchAlbumsForSeed(artistName),
    staleTime: 1000 * 60 * 60 * 12,
    networkMode: 'online',
  })

  const albums = query.data ?? []
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

  if (!query.isLoading && albums.length === 0) return null

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
