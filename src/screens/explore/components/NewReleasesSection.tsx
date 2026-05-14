import React, { useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '@/hooks/useTheme'
import { useArtists } from '@/hooks/artists'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import { selectArtistPlayCounts } from '@/utils/redux/selectors/statsSelectors'
import { getNewReleasesForArtists } from '@/api/deezer'
import { QueryKeys } from '@/enums/queryKeys'
import { useIsOffline } from '@/hooks/useIsOffline'
import { getExploreDayKey, getExploreSeed, seededShuffle } from '@/features/explore/hooks/useDailyLayout'
import { useDeezerEnabled } from '@/features/explore/hooks/useDeezerEnabled'
import MediaTile from './MediaTile'
import ExploreLoadingTiles from './ExploreLoadingTiles'
import type { ExternalAlbumBase } from '@/types'

const H_PADDING = 16
const VISIBLE_ITEMS = 2.5
const MIN_ALBUMS = 8
const SEED_COUNT = 8
const SEED_POOL_SIZE = 20

export default function NewReleasesSection() {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const isOffline = useIsOffline()
  const isEnabled = useDeezerEnabled()
  const { artists } = useArtists()
  const artistPlayCounts = useSelector(selectArtistPlayCounts)
  const dayKey = getExploreDayKey()
  const dailySeed = getExploreSeed(dayKey)

  const screenWidth = Dimensions.get('window').width
  const gridGap = 12
  const gridItemWidth = (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS

  const seedNames = useMemo(() => {
    const pool = [...artists]
      .filter(a => a.name.trim() && a.name.toLowerCase() !== 'various artists')
      .sort((a, b) => (artistPlayCounts[b.id] ?? 0) - (artistPlayCounts[a.id] ?? 0))
      .slice(0, SEED_POOL_SIZE)

    return seededShuffle(pool, dailySeed)
      .slice(0, SEED_COUNT)
      .map(a => a.name)
  }, [artists, artistPlayCounts, dailySeed])

  const queryKey = useMemo(
    () => [QueryKeys.ExploreNewReleases, dayKey, seedNames.join(',')],
    [dayKey, seedNames]
  )

  const query = useQuery<ExternalAlbumBase[]>({
    queryKey,
    queryFn: () => getNewReleasesForArtists(seedNames),
    enabled: seedNames.length > 0 && isEnabled,
    staleTime: 1000 * 60 * 60 * 6,
    networkMode: 'online',
  })

  const data = useMemo(() => query.data ?? [], [query.data])
  const coversToPrefetch = useMemo(() => data.map(a => a.cover), [data])
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

  if (isOffline || seedNames.length === 0) return null
  if (!query.isLoading && data.length < MIN_ALBUMS) return null

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        {t('explore.sections.newReleases')}
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
          data={data}
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
  },
  titleDark: {
    color: '#fff',
  },
})
