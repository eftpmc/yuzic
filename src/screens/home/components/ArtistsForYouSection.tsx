import React, { useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/useTheme'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import { useSimilarContent } from '@/features/home/hooks/useSimilarContent'
import { useMatchedNavigation } from '@/features/sources/useMatchedNavigation'
import MediaTile from './MediaTile'
import LoadingTiles from './LoadingTiles'
import type { ExternalArtistBase } from '@/types'

const H_PADDING = 16
const VISIBLE_ITEMS = 2.5
const MIN_ITEMS = 8

export default function ArtistsForYouSection() {
  const { t } = useTranslation()
  const { colors } = useTheme()
  const { artists, artistsReady } = useSimilarContent()
  const { navigateToArtist } = useMatchedNavigation()

  const screenWidth = Dimensions.get('window').width
  const gridGap = 12
  const gridItemWidth = (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS

  const coversToPrefetch = useMemo(() => artists.map(a => a.cover), [artists])
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
        navigateToArtist(item)
      }}
    />
  ), [navigation, gridItemWidth])

  if (artistsReady && artists.length < MIN_ITEMS) return null

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.secondary }]}>
        {t('explore.sections.artistsForYou')}
      </Text>
      {!artistsReady ? (
        <LoadingTiles
          itemSize={gridItemWidth}
          gap={gridGap}
          horizontalPadding={H_PADDING}
          variant="artist"
        />
      ) : (
        <FlashList
          horizontal
          data={artists}
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
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: H_PADDING,
  },
})
