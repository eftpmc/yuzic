import React, { useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '@/hooks/useTheme'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import { getDeezerChartAlbums } from '@/api/deezer'
import { QueryKeys } from '@/enums/queryKeys'
import { getExploreDayKey } from '@/features/explore/hooks/useDailyLayout'
import MediaTile from './MediaTile'
import ExploreLoadingTiles from './ExploreLoadingTiles'
import type { ExternalAlbumBase } from '@/types'

const H_PADDING = 16
const VISIBLE_ITEMS = 2.5
const MIN_ALBUMS = 8

export default function DeezerChartsSection() {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const dayKey = getExploreDayKey()

  const screenWidth = Dimensions.get('window').width
  const gridGap = 12
  const gridItemWidth = (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS

  const query = useQuery<ExternalAlbumBase[]>({
    queryKey: [QueryKeys.ExploreDeezerCharts, dayKey],
    queryFn: () => getDeezerChartAlbums(10),
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

  if (!query.isLoading && data.length < MIN_ALBUMS) return null

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        {t('explore.sections.charts')}
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
