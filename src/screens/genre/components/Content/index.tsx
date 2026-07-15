import React, { useCallback, useMemo } from 'react'
import { View } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'

import { AlbumBase } from '@/types'
import { useTheme } from '@/hooks/useTheme'
import AlbumRow from '@/components/rows/AlbumRow'
import GenreHeader, { GenreHeaderBar } from '../Header'

type Props = {
  genre: string
  albums: AlbumBase[]
}

export default function GenreContent({ genre, albums }: Props) {
  const navigation = useNavigation<any>()
  const { colors } = useTheme()

  const header = useMemo(
    () => <GenreHeader genre={genre} albums={albums} showNavigation={false} />,
    [genre, albums]
  )

  const renderItem = useCallback(
    ({ item }: { item: AlbumBase }) => (
      <AlbumRow
        album={item}
        onPress={(album) => navigation.push('albumView', { id: album.id })}
      />
    ),
    [navigation]
  )

  return (
    <View style={{ flex: 1 }}>
      <GenreHeaderBar genre={genre} albums={albums} />
      <FlashList
        data={albums}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 140,
          backgroundColor: colors.background,
        }}
      />
    </View>
  )
}
