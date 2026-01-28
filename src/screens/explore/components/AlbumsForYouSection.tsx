import React from 'react'
import { View, Dimensions } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import MediaTile from './MediaTile'
import ExploreEmptyCard from './ExploreEmptyCard'
import { ExternalAlbumBase } from '@/types'

const H_PADDING = 16
const VISIBLE_ITEMS = 2.5

type Props = {
  data: ExternalAlbumBase[]
  ready: boolean
}

export default function AlbumsForYouSection({
  data,
  ready,
}: Props) {
  const navigation = useNavigation()
  const screenWidth = Dimensions.get('window').width
  const gridGap = 12

  const gridItemWidth =
    (screenWidth - H_PADDING * 2 - gridGap * 2) /
    VISIBLE_ITEMS

  const tileHeight =
    gridItemWidth + 8 + 14 + 4 + 12

  const showEmpty = !ready || data.length === 0
  if (showEmpty) {
    return (
      <View style={{ paddingHorizontal: H_PADDING }}>
        <ExploreEmptyCard
          width={screenWidth - H_PADDING * 2}
          height={tileHeight}
          radius={14}
          loading={!ready}
        />
      </View>
    )
  }

  return (
    <FlashList
      horizontal
      data={data}
      keyExtractor={item => item.id}
      estimatedItemSize={gridItemWidth}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: H_PADDING,
      }}
      ItemSeparatorComponent={() => (
        <View style={{ width: gridGap }} />
      )}
      renderItem={({ item }) => (
        <MediaTile
          cover={item.cover}
          title={item.title}
          subtitle={item.subtext}
          size={gridItemWidth}
          radius={14}
          onPress={() =>
            navigation.navigate(
              'externalAlbumView',
              { albumId: item.id }
            )
          }
        />
      )}
    />
  )
}