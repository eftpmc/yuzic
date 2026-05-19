import React, { useCallback, useMemo, useRef } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useTheme } from '@/hooks/useTheme'
import { useAlbums } from '@/hooks/albums'
import { useArtists } from '@/hooks/artists'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import { useDeezerDiscoveryEnabled } from '@/features/home/hooks/useDeezerEnabled'
import { useMatchedNavigation } from '@/features/sources/useMatchedNavigation'
import { selectLibraryGenres } from '@/utils/redux/selectors/librarySelectors'
import {
  SECTION_H_PADDING as H_PADDING,
  SECTION_GRID_GAP,
  SECTION_VISIBLE_ITEMS,
  STALE_DEEZER_DISCOVERY,
} from '@/features/home/constants'
import * as deezer from '@/api/deezer'
import { QueryKeys } from '@/enums/queryKeys'
import { getDayKey } from '@/features/home/hooks/useDailyLayout'
import { collectCoveredAlbumsForArtists } from '@/features/home/utils/albumDiscovery'
import SelectionBottomSheet from '@/components/SelectionBottomSheet'
import MediaTile from './MediaTile'
import LoadingTiles from './LoadingTiles'
import type { ExternalAlbumBase } from '@/types'

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
  if (!albumNeedle || !selectedNeedle) return false
  return (
    albumNeedle === selectedNeedle ||
    albumNeedle.includes(selectedNeedle) ||
    selectedNeedle.includes(albumNeedle)
  )
}

function findDeezerGenreId(
  libraryGenre: string,
  deezerGenres: { id: number; name: string }[]
): number | null {
  const needle = normalize(libraryGenre)
  if (!needle) return null
  const exact = deezerGenres.find(g => normalize(g.name) === needle)
  if (exact) return exact.id
  const sub = deezerGenres.find(g => {
    const n = normalize(g.name)
    return n && needle.includes(n)
  })
  if (sub) return sub.id
  const rev = deezerGenres.find(g => {
    const n = normalize(g.name)
    return n && n.includes(needle)
  })
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
  refreshKey?: number
}

export default function GenreSection({ genre, refreshKey = 0 }: Props) {
  const { t } = useTranslation()
  const { navigateToAlbum } = useMatchedNavigation()
  const { colors } = useTheme()
  const { albums: libraryAlbums } = useAlbums()
  const { artists: libraryArtists } = useArtists()
  const libraryGenres = useSelector(selectLibraryGenres)
  const { width: screenWidth } = useWindowDimensions()
  const sheetRef = useRef<BottomSheetModal>(null)
  const dayKey = getDayKey()
  const isEnabled = useDeezerDiscoveryEnabled()

  const [selectedGenre, setSelectedGenre] = React.useState<string>(genre)

  const gridItemWidth = useMemo(
    () => (screenWidth - H_PADDING * 2 - SECTION_GRID_GAP * 2) / SECTION_VISIBLE_ITEMS,
    [screenWidth]
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
    sheetRef.current?.dismiss()
  }, [])

  const handleRandomize = useCallback(() => {
    const eligible = allGenres.filter(g => g !== selectedGenre)
    const pool = eligible.length > 0 ? eligible : allGenres
    const random = pool[Math.floor(Math.random() * pool.length)]
    if (random) setSelectedGenre(random)
    sheetRef.current?.dismiss()
  }, [allGenres, selectedGenre])

  const query = useQuery<ExternalAlbumBase[]>({
    queryKey: [QueryKeys.ExploreGenreRow, dayKey, selectedGenre, seedArtistNames.join('|'), refreshKey],
    queryFn: () => fetchAlbumsForGenre(selectedGenre, seedArtistNames, libraryArtistNames),
    enabled: isEnabled,
    staleTime: STALE_DEEZER_DISCOVERY,
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
        navigateToAlbum(item)
      }}
    />
  ), [navigateToAlbum, gridItemWidth])

  const isEmpty = !query.isLoading && albums.length === 0

  return (
    <>
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Text style={[styles.titlePrefix, { color: colors.secondary }]}>
            {t('explore.sections.genrePrefix')}
          </Text>
          <TouchableOpacity onPress={() => sheetRef.current?.present()} hitSlop={8}>
            <Text
              style={[styles.genreName, { color: colors.secondary, borderBottomColor: colors.secondary }]}
              numberOfLines={1}
            >
              {selectedGenre}
            </Text>
          </TouchableOpacity>
        </View>

        {query.isLoading ? (
          <LoadingTiles
            itemSize={gridItemWidth}
            gap={SECTION_GRID_GAP}
            horizontalPadding={H_PADDING}
            variant="album"
          />
        ) : query.isError ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              Unable to load — try again later
            </Text>
          </View>
        ) : isEmpty ? (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              No results — try a different genre
            </Text>
          </View>
        ) : (
          <FlashList
            horizontal
            data={albums}
            keyExtractor={item => item.id}
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: H_PADDING }}
            ItemSeparatorComponent={() => <View style={{ width: SECTION_GRID_GAP }} />}
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
    fontWeight: '600',
  },
  genreName: {
    fontSize: 20,
    fontWeight: '600',
    borderBottomWidth: 1.5,
    paddingBottom: 1,
  },
  emptyState: {
    paddingHorizontal: H_PADDING,
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 14,
  },
})
