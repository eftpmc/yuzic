import React, { useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/useTheme'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import MediaTile from './MediaTile'
import ExploreLoadingTiles from './ExploreLoadingTiles'
import { ExternalArtistBase } from '@/types'
import { prefetchCovers } from '@/utils/images/imageCache'

const H_PADDING = 16
const VISIBLE_ITEMS = 2.5

type Props = {
  data: ExternalArtistBase[]
  ready: boolean
}

export default function ArtistsForYouSection({ data, ready }: Props) {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const screenWidth = Dimensions.get('window').width
  const gridGap = 12

  const gridItemWidth = (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS
  const coversToPrefetch = useMemo(() => data.map(artist => artist.cover), [data])
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

  if (ready && data.length === 0) return null

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        {t('explore.sections.artistsForYou')}
      </Text>
      {!ready ? (
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
