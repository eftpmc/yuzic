import React, { useMemo } from 'react'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import type { ExternalArtist } from '@/types'
import ExternalAlbumRow from '@/components/rows/ExternalAlbumRow'
import Header from '../Header'
import { useTheme } from '@/hooks/useTheme'

type Props = {
  artist: ExternalArtist
}

const ESTIMATED_ROW_HEIGHT = 80

export default function ExternalArtistContent({ artist }: Props) {
  const navigation = useNavigation()
  const { isDarkMode } = useTheme()

  const header = useMemo(() => <Header artist={artist} />, [artist])

  return (
    <FlashList
      data={artist.albums}
      keyExtractor={(item) => item.id}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      ListHeaderComponent={header}
      renderItem={({ item }) => (
        <ExternalAlbumRow
          album={item}
          artistName={artist.name}
          onPress={(album) =>
            navigation.navigate('externalAlbumView', { albumId: album.id })
          }
        />
      )}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 140,
        backgroundColor: isDarkMode ? '#000' : '#fff',
      }}
    />
  )
}
