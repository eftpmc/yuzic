import React from 'react'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import type { Artist } from '@/types'
import AlbumRow from '@/components/rows/AlbumRow'
import ListSeparator from '@/components/ListSeparator'
import Header from '../Header'
import { useTheme } from '@/hooks/useTheme'
import { useArtistMbid } from '@/hooks/artists'

type Props = {
  artist: Artist
}

const ESTIMATED_ROW_HEIGHT = 80

export default function ArtistContent({ artist }: Props) {
  const navigation = useNavigation()
  const { isDarkMode } = useTheme()
  const { data: mbid } = useArtistMbid({ id: artist.id, name: artist.name })

  return (
    <FlashList
      data={artist.ownedAlbums}
      keyExtractor={(item) => item.id}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      ListHeaderComponent={<Header artist={artist} mbid={mbid ?? null} />}
      renderItem={({ item }) => (
        <AlbumRow
          album={item}
          onPress={(album) =>
            navigation.navigate('albumView', { id: album.id })
          }
        />
      )}
      ItemSeparatorComponent={ListSeparator}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 140,
        backgroundColor: isDarkMode ? '#000' : '#fff',
      }}
    />
  )
}
