import React, { useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useTheme } from '@/hooks/useTheme'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import { getDeezerChartArtists } from '@/api/deezer'
import { QueryKeys } from '@/enums/queryKeys'
import { getExploreDayKey } from '@/features/explore/hooks/useDailyLayout'
import { useDeezerEnabled } from '@/features/explore/hooks/useDeezerEnabled'
import MediaTile from './MediaTile'
import ExploreLoadingTiles from './ExploreLoadingTiles'
import type { ExternalArtistBase } from '@/types'

const H_PADDING = 16
const VISIBLE_ITEMS = 2.5
const MIN_ARTISTS = 8

export default function TopArtistsSection() {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const dayKey = getExploreDayKey()
  const isEnabled = useDeezerEnabled()

  const screenWidth = Dimensions.get('window').width
  const gridGap = 12
  const gridItemWidth = (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS

  const query = useQuery<ExternalArtistBase[]>({
    queryKey: [QueryKeys.ExploreTopArtists, dayKey],
    queryFn: () => getDeezerChartArtists(10),
    enabled: isEnabled,
    staleTime: 1000 * 60 * 60 * 6,
    networkMode: 'online',
  })

  const data = useMemo(() => query.data ?? [], [query.data])
  const coversToPrefetch = useMemo(() => data.map(a => a.cover), [data])
  usePrefetchCovers(coversToPrefetch, 'grid')

  const renderArtist = useCallback(({ item }: { item: ExternalArtistBase }) => (
    <MediaTile
      cover={item.cover}
      title={item.name}
      subtitle={item.subtext}
      size={gridItemWidth}
      radius={gridItemWidth / 2}
      onPress={() => {
        prefetchCovers([item.cover], 'detail')
        navigation.navigate('externalArtistView', {
          source: item.externalSource,
          artistId: item.externalIds?.deezerId,
          name: item.name,
        })
      }}
    />
  ), [navigation, gridItemWidth])

  if (!query.isLoading && data.length < MIN_ARTISTS) return null

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        {t('explore.sections.topArtists')}
      </Text>
      {query.isLoading ? (
        <ExploreLoadingTiles
          itemSize={gridItemWidth}
          gap={gridGap}
          horizontalPadding={H_PADDING}
          variant="artist"
        />
      ) : (
        <FlashList
          horizontal
          data={data}
          keyExtractor={item => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: H_PADDING }}
          ItemSeparatorComponent={() => <View style={{ width: gridGap }} />}
          renderItem={renderArtist}
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
