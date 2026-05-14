import React, { useCallback, useMemo, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useTheme } from '@/hooks/useTheme'
import { useAlbums } from '@/hooks/albums'
import { useArtists } from '@/hooks/artists'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import { mmkv } from '@/utils/mmkvStorage'
import { useDeezerEnabled } from '@/features/explore/hooks/useDeezerEnabled'
import { selectLibraryGenres } from '@/utils/redux/selectors/librarySelectors'
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
const SEED_ARTISTS = 4
const RELATED_PER_SEED = 12
const GENRE_ARTIST_LIMIT = 40
const STORAGE_KEY = 'explore:genre'

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
  const exact = deezerGenres.find(g => normalize(g.name) === needle)
  if (exact) return exact.id
  const sub = deezerGenres.find(g => needle.includes(normalize(g.name)))
  if (sub) return sub.id
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
  const libraryGenres = useSelector(selectLibraryGenres)
  const sheetRef = useRef<BottomSheetModal>(null)
  const dayKey = getExploreDayKey()
  const isEnabled = useDeezerEnabled()

  const [selectedGenre, setSelectedGenre] = React.useState<string>(
    () => mmkv.getString(STORAGE_KEY) ?? genre
  )

  const allGenres = useMemo(() => {
    const genres = new Set<string>()
    libraryGenres.forEach(g => { if (g.trim()) genres.add(g.trim()) })
    libraryAlbums.forEach(album => {
      album.genres?.forEach(g => { if (g.trim()) genres.add(g.trim()) })
    })
    return [...genres].sort()
  }, [libraryGenres, libraryAlbums])

  const libraryArtistNames = useMemo(
    () => new Set(libraryArtists.map(a => a.name.toLowerCase())),
    [libraryArtists]
  )

  const seedArtistNames = useMemo(() => {
    const seen = new Set<string>()
    return libraryAlbums
      .filter(album => album.genres?.some(albumGenre => genreMatches(albumGenre, selectedGenre)))
      .map(album => album.artist.name)
      .filter(name => {
        const normalized = name.trim().toLowerCase()
        if (!normalized || normalized === 'various artists' || seen.has(normalized)) return false
        seen.add(normalized)
        return true
      })
      .slice(0, SEED_ARTISTS)
  }, [selectedGenre, libraryAlbums])

  const handleSelect = useCallback((value: string) => {
    setSelectedGenre(value)
    mmkv.set(STORAGE_KEY, value)
    sheetRef.current?.dismiss()
  }, [])

  const handleRandomize = useCallback(() => {
    const eligible = allGenres.filter(g => g !== selectedGenre)
    const pool = eligible.length > 0 ? eligible : allGenres
    const random = pool[Math.floor(Math.random() * pool.length)]
    if (random) {
      setSelectedGenre(random)
      mmkv.set(STORAGE_KEY, random)
    }
    sheetRef.current?.dismiss()
  }, [allGenres, selectedGenre])

  const screenWidth = Dimensions.get('window').width
  const gridGap = 12
  const gridItemWidth = (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS

  const query = useQuery<ExternalAlbumBase[]>({
    queryKey: [QueryKeys.ExploreGenreRow, dayKey, selectedGenre, seedArtistNames.join('|')],
    queryFn: () => fetchAlbumsForGenre(selectedGenre, seedArtistNames, libraryArtistNames),
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
            {t('explore.sections.genrePrefix')}
          </Text>
          <TouchableOpacity
            onPress={() => sheetRef.current?.present()}
            hitSlop={8}
          >
            <Text
              style={[styles.genreName, isDarkMode && styles.genreNameDark]}
              numberOfLines={1}
            >
              {selectedGenre}
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
              No results — try a different genre
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
        items={allGenres}
        onSelect={handleSelect}
        onRandomize={handleRandomize}
        placeholder={t('explore.sections.searchGenres')}
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
  genreName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    borderBottomWidth: 1.5,
    borderBottomColor: '#000',
    paddingBottom: 1,
  },
  genreNameDark: {
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
