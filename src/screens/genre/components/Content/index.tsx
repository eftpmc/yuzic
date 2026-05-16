import React, { useMemo } from 'react'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'

import { AlbumBase } from '@/types'
import { useTheme } from '@/hooks/useTheme'
import AlbumRow from '@/components/rows/AlbumRow'
import GenreHeader from '../Header'

type Props = {
  genre: string
  albums: AlbumBase[]
}

export default function GenreContent({ genre, albums }: Props) {
  const navigation = useNavigation<any>()
  const { colors } = useTheme()

  const header = useMemo(
    () => <GenreHeader genre={genre} albums={albums} />,
    [genre, albums]
  )

  return (
    <FlashList
      data={albums}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <AlbumRow
          album={item}
          onPress={(album) => navigation.navigate('albumView', { id: album.id })}
        />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 140,
        backgroundColor: colors.background,
      }}
    />
  )
}
