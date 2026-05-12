import React, { useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/useTheme'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import { prefetchCovers } from '@/utils/images/imageCache'
import { useSimilarContent } from '@/features/explore/hooks/useSimilarContent'
import MediaTile from './MediaTile'
import ExploreLoadingTiles from './ExploreLoadingTiles'
import type { ExternalArtistBase } from '@/types'

const H_PADDING = 16
const VISIBLE_ITEMS = 2.5
const MIN_ITEMS = 8

export default function ArtistsForYouSection() {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const { artists, artistsReady } = useSimilarContent()

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
        navigation.navigate('externalArtistView', {
          source: item.externalSource,
          artistId: item.externalIds?.deezerId,
          mbid: item.externalIds?.mbid ?? item.id,
          name: item.name,
        })
      }}
    />
  ), [navigation, gridItemWidth])

  if (artistsReady && artists.length < MIN_ITEMS) return null

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        {t('explore.sections.artistsForYou')}
      </Text>
      {!artistsReady ? (
        <ExploreLoadingTiles
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
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
    marginLeft: H_PADDING,
  },
  titleDark: {
    color: '#fff',
  },
})
