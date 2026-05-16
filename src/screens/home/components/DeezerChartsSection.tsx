import React, { useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '@/hooks/useTheme'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import { getDeezerChartAlbums } from '@/api/deezer'
import { QueryKeys } from '@/enums/queryKeys'
import { getExploreDayKey } from '@/features/home/hooks/useDailyLayout'
import { useDeezerDiscoveryEnabled } from '@/features/home/hooks/useDeezerEnabled'
import {
  SECTION_H_PADDING as H_PADDING,
  SECTION_GRID_GAP,
  SECTION_VISIBLE_ITEMS,
  STALE_DEEZER_CHARTS,
} from '@/features/home/constants'
import MediaTile from './MediaTile'
import ExploreLoadingTiles from './ExploreLoadingTiles'
import type { ExternalAlbumBase } from '@/types'

const MIN_ALBUMS = 8

type Props = { refreshKey?: number }

export default function DeezerChartsSection({ refreshKey = 0 }: Props) {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { width: screenWidth } = useWindowDimensions()
  const dayKey = getExploreDayKey()
  const isEnabled = useDeezerDiscoveryEnabled()

  const gridItemWidth = useMemo(
    () => (screenWidth - H_PADDING * 2 - SECTION_GRID_GAP * 2) / SECTION_VISIBLE_ITEMS,
    [screenWidth]
  )

  const query = useQuery<ExternalAlbumBase[]>({
    queryKey: [QueryKeys.ExploreDeezerCharts, dayKey, refreshKey],
    queryFn: () => getDeezerChartAlbums(10),
    enabled: isEnabled,
    staleTime: STALE_DEEZER_CHARTS,
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

  if (query.isError) return null
  if (!query.isLoading && data.length < MIN_ALBUMS) return null

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>
        {t('explore.sections.charts')}
      </Text>
      {query.isLoading ? (
        <ExploreLoadingTiles
          itemSize={gridItemWidth}
          gap={SECTION_GRID_GAP}
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
          ItemSeparatorComponent={() => <View style={{ width: SECTION_GRID_GAP }} />}
          estimatedItemSize={gridItemWidth}
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
    marginBottom: 12,
    marginLeft: H_PADDING,
  },
})
