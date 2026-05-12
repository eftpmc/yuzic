import React, { useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '@/hooks/useTheme'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import { useAlbums } from '@/hooks/albums'
import { useArtists } from '@/hooks/artists'
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
const SEED_ARTISTS = 4
const RELATED_PER_SEED = 12
const GENRE_ARTIST_LIMIT = 40

function normalize(s: string): string {
  return s.toLowerCase().replace(/[-_/]+/g, ' ').trim()
}

function genreMatches(albumGenre: string, selectedGenre: string): boolean {
  const albumNeedle = normalize(albumGenre)
  const selectedNeedle = normalize(selectedGenre)
  return albumNeedle === selectedNeedle ||
    albumNeedle.includes(selectedNeedle) ||
    selectedNeedle.includes(albumNeedle)
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
  seedArtistNames: string[],
  libraryArtistNames: Set<string>
): Promise<ExternalAlbumBase[]> {
  const albums: ExternalAlbumBase[] = []
  if (seedArtistNames.length > 0) {
    const seedArtists = (await Promise.allSettled(
      seedArtistNames.slice(0, SEED_ARTISTS).map(name => deezer.resolveDeezerArtistByName(name))
    ))
      .map(result => result.status === 'fulfilled' ? result.value : null)
      .filter((artist): artist is NonNullable<typeof artist> => Boolean(artist))

    const relatedGroups = await Promise.allSettled(
      seedArtists.map(seed => deezer.getDeezerRelatedArtists(seed.id, RELATED_PER_SEED))
    )

    const seenArtists = new Set<string>()
    const relatedArtists = relatedGroups
      .flatMap(result => result.status === 'fulfilled' ? result.value : [])
      .filter(artist => {
        const nameKey = artist.name.toLowerCase()
        if (libraryArtistNames.has(nameKey) || seenArtists.has(nameKey)) return false
        seenArtists.add(nameKey)
        return true
      })

    albums.push(...await collectCoveredAlbumsForArtists(relatedArtists, { targetAlbums: TARGET_ALBUMS }))
  }

  if (albums.length >= TARGET_ALBUMS) return albums

  const genreList = await deezer.getDeezerGenreList()
  const genreId = findDeezerGenreId(genre, genreList)
  if (!genreId) return albums

  const artists = await deezer.getDeezerArtistsByGenreId(genreId, GENRE_ARTIST_LIMIT)
  const fresh = artists.filter(a => !libraryArtistNames.has(a.name.toLowerCase()))

  albums.push(...await collectCoveredAlbumsForArtists(fresh, {
    targetAlbums: TARGET_ALBUMS - albums.length,
    excludeAlbumIds: albums.map(album => album.id),
  }))
  return albums.slice(0, TARGET_ALBUMS)
}

type Props = {
  genre: string
}

export default function GenreSection({ genre }: Props) {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const { albums: libraryAlbums } = useAlbums()
  const { artists: libraryArtists } = useArtists()
  const dayKey = getExploreDayKey()

  const libraryArtistNames = useMemo(
    () => new Set(libraryArtists.map(a => a.name.toLowerCase())),
    [libraryArtists]
  )
  const libraryArtistKey = useMemo(
    () => [...libraryArtistNames].sort().join('|'),
    [libraryArtistNames]
  )
  const seedArtistNames = useMemo(() => {
    const seen = new Set<string>()
    return libraryAlbums
      .filter(album => album.genres?.some(albumGenre => genreMatches(albumGenre, genre)))
      .map(album => album.artist.name)
      .filter(name => {
        const normalized = name.trim().toLowerCase()
        if (!normalized || normalized === 'various artists' || seen.has(normalized)) return false
        seen.add(normalized)
        return true
      })
      .slice(0, SEED_ARTISTS)
  }, [genre, libraryAlbums])

  const screenWidth = Dimensions.get('window').width
  const gridGap = 12
  const gridItemWidth = (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS

  const query = useQuery<ExternalAlbumBase[]>({
    queryKey: [QueryKeys.ExploreGenreRow, dayKey, genre, seedArtistNames.join('|'), libraryArtistKey],
    queryFn: () => fetchAlbumsForGenre(genre, seedArtistNames, libraryArtistNames),
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
