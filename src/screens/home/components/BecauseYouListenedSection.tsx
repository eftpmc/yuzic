import React, { useCallback, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { BottomSheetModal } from '@gorhom/bottom-sheet'
import { useTheme } from '@/hooks/useTheme'
import { useArtists } from '@/hooks/artists'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import { useDeezerDiscoveryEnabled } from '@/features/home/hooks/useDeezerEnabled'
import { useMatchedNavigation } from '@/features/sources/useMatchedNavigation'
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
import SkeletonTiles from '@/components/SkeletonTiles'
import type { ExternalAlbumBase } from '@/types';
import { HOME_TARGET_ALBUMS, HOME_RELATED_ARTIST_LIMIT } from '@/constants/home';
import Touchable from '@/components/Touchable';
import { spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

async function fetchAlbumsForSeed(
  artistName: string,
  libraryArtistNames: Set<string>
): Promise<ExternalAlbumBase[]> {
  const seedArtist = await deezer.resolveDeezerArtistByName(artistName)
  if (!seedArtist) return []

  const related = await deezer.getDeezerRelatedArtists(seedArtist.id, HOME_RELATED_ARTIST_LIMIT)
  const fresh = related.filter(artist => !libraryArtistNames.has(artist.name.toLowerCase()))

  return collectCoveredAlbumsForArtists(fresh, { targetAlbums: HOME_TARGET_ALBUMS })
}

type Props = {
  artistName: string
  refreshKey?: number
}

export default function BecauseYouListenedSection({ artistName, refreshKey = 0 }: Props) {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const rad = useRadius()
  const { artists: libraryArtists } = useArtists()
  const { navigateToAlbum } = useMatchedNavigation()
  const { width: screenWidth } = useWindowDimensions()
  const sheetRef = useRef<BottomSheetModal>(null)
  const dayKey = getDayKey()
  const isEnabled = useDeezerDiscoveryEnabled()

  const [selectedArtist, setSelectedArtist] = React.useState<string>(artistName)

  const gridItemWidth = useMemo(
    () => (screenWidth - H_PADDING * 2 - SECTION_GRID_GAP * 2) / SECTION_VISIBLE_ITEMS,
    [screenWidth]
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
    sheetRef.current?.dismiss()
  }, [])

  const handleRandomize = useCallback(() => {
    const eligible = artistNames.filter(n => n !== selectedArtist)
    const pool = eligible.length > 0 ? eligible : artistNames
    const random = pool[Math.floor(Math.random() * pool.length)]
    if (random) setSelectedArtist(random)
    sheetRef.current?.dismiss()
  }, [artistNames, selectedArtist])

  const query = useQuery<ExternalAlbumBase[]>({
    // Include libraryArtists.length so the exclusion set (libraryArtistNames)
    // stays fresh: new library artists should stop appearing in suggestions
    // rather than waiting out the full 12h staleTime.
    queryKey: [QueryKeys.ExploreBecauseYouListened, dayKey, selectedArtist, libraryArtists.length, refreshKey],
    queryFn: () => fetchAlbumsForSeed(selectedArtist, libraryArtistNames),
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
      radius={rad.card}
      onPress={() => {
        prefetchCovers([item.cover], 'detail')
        navigateToAlbum(item)
      }}
    />
  ), [navigateToAlbum, gridItemWidth, rad.card])

  const isEmpty = !query.isLoading && albums.length === 0

  return (
    <>
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Text style={[styles.titlePrefix, { color: colors.secondary }]}>
            {t('explore.sections.becauseYouListenedLabel')}
          </Text>
          <Touchable onPress={() => sheetRef.current?.present()} hitSlop={8}>
            <Text
              style={[styles.artistName, { color: colors.secondary, borderBottomColor: colors.secondary }]}
              numberOfLines={1}
            >
              {selectedArtist}
            </Text>
          </Touchable>
        </View>

        {query.isLoading ? (
          <SkeletonTiles
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
              No results — try a different artist
            </Text>
          </View>
        ) : (
          <FlashList
            horizontal
            data={albums}
            keyExtractor={item => item.id}
            overrideItemLayout={layout => { (layout as { size?: number }).size = gridItemWidth }}
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
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: spacing.md,
    marginLeft: H_PADDING,
    marginRight: H_PADDING,
  },
  titlePrefix: {
    ...typography.sectionTitle,
  },
  artistName: {
    ...typography.sectionTitle,
    borderBottomWidth: 1.5,
    paddingBottom: spacing.xxs,
  },
  emptyState: {
    paddingHorizontal: H_PADDING,
    paddingVertical: spacing.xl,
  },
  emptyText: {
    ...typography.rowSubtitle,
  },
})
