import React, { useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '@/hooks/useTheme'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import { useArtists } from '@/hooks/artists'
import * as deezer from '@/api/deezer'
import { QueryKeys } from '@/enums/queryKeys'
import MediaTile from './MediaTile'
import ExploreLoadingTiles from './ExploreLoadingTiles'
import type { ExternalAlbumBase } from '@/types'

const H_PADDING = 16
const VISIBLE_ITEMS = 2.5
const TARGET_ALBUMS = 10

function normalize(s: string): string {
  return s.toLowerCase().replace(/[-_/]+/g, ' ').trim()
}

function findDeezerGenreId(
  libraryGenre: string,
  deezerGenres: { id: number; name: string }[]
): number | null {
  const needle = normalize(libraryGenre)
  // Exact match
  const exact = deezerGenres.find(g => normalize(g.name) === needle)
  if (exact) return exact.id
  // Library genre contains a Deezer genre name (e.g. "Post-Rock" contains "rock")
  const sub = deezerGenres.find(g => needle.includes(normalize(g.name)))
  if (sub) return sub.id
  // Deezer genre name contains the library genre
  const rev = deezerGenres.find(g => normalize(g.name).includes(needle))
  return rev?.id ?? null
}

async function fetchAlbumsForGenre(
  genre: string,
  libraryArtistNames: Set<string>
): Promise<ExternalAlbumBase[]> {
  const genreList = await deezer.getDeezerGenreList()
  const genreId = findDeezerGenreId(genre, genreList)
  if (!genreId) return []

  const artists = await deezer.getDeezerArtistsByGenreId(genreId, TARGET_ALBUMS + 5)
  const fresh = artists.filter(a => !libraryArtistNames.has(a.name.toLowerCase()))

  const results = await Promise.allSettled(
    fresh.slice(0, TARGET_ALBUMS + 3).map(async artist => {
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
  genre: string
}

export default function GenreSection({ genre }: Props) {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const { artists: libraryArtists } = useArtists()

  const libraryArtistNames = useMemo(
    () => new Set(libraryArtists.map(a => a.name.toLowerCase())),
    [libraryArtists]
  )

  const screenWidth = Dimensions.get('window').width
  const gridGap = 12
  const gridItemWidth = (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS

  const query = useQuery<ExternalAlbumBase[]>({
    queryKey: [QueryKeys.ExploreGenreRow, genre],
    queryFn: () => fetchAlbumsForGenre(genre, libraryArtistNames),
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
        {t('explore.sections.genre', { genre })}
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
