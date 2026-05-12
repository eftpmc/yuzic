import React, { useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/useTheme'
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers'
import MediaTile from './MediaTile'
import ExploreLoadingTiles from './ExploreLoadingTiles'
import { ExternalAlbumBase } from '@/types'
import { prefetchCovers } from '@/utils/images/imageCache'

const H_PADDING = 16
const VISIBLE_ITEMS = 2.5
const MIN_ITEMS = 8
const MAX_ITEMS = 10

type Props = {
  data: ExternalAlbumBase[]
  ready: boolean
}

export default function AlbumsForYouSection({ data, ready }: Props) {
  const navigation = useNavigation<any>()
  const { t } = useTranslation()
  const { isDarkMode } = useTheme()
  const screenWidth = Dimensions.get('window').width
  const gridGap = 12

  const gridItemWidth = (screenWidth - H_PADDING * 2 - gridGap * 2) / VISIBLE_ITEMS
  const albums = useMemo(() => data.slice(0, MAX_ITEMS), [data])
  const coversToPrefetch = useMemo(() => albums.map(album => album.cover), [albums])
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

  if (ready && albums.length < MIN_ITEMS) return null

  return (
    <View style={styles.container}>
      <Text style={[styles.title, isDarkMode && styles.titleDark]}>
        {t('explore.sections.albumsForYou')}
      </Text>
      {!ready ? (
        <ExploreLoadingTiles
          itemSize={gridItemWidth}
          gap={gridGap}
          horizontalPadding={H_PADDING}
          variant="album"
        />
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
