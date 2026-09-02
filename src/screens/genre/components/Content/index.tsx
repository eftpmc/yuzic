import React, { useCallback, useMemo } from 'react'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'

import { AlbumBase } from '@/types'
import { useTheme } from '@/hooks/useTheme'
import AlbumRow from '@/components/rows/AlbumRow'
import GenreHeader, { GenreHeaderBar } from '../Header'
import { DetailScreen } from '@/components/DetailHeader'
import { spacing } from '@/constants/design'

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
    <DetailScreen bar={<GenreHeaderBar genre={genre} albums={albums} />}>
      {scroll => (
      <FlashList
        data={albums}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: spacing.scrollClearance,
          backgroundColor: colors.background,
        }}
        {...scroll}
      />
      )}
    </DetailScreen>
  )
}
