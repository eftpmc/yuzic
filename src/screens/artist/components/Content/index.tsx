import React from 'react'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import type { Artist } from '@/types'
import AlbumRow from '@/components/rows/AlbumRow'
import Header from '../Header'
import { useTheme } from '@/hooks/useTheme'
import { useArtistMbid } from '@/hooks/artists'

type Props = {
  artist: Artist;
  onRefresh: () => void;
  isRefreshing: boolean;
};

type CombinedAlbum =
  | (AlbumBase & { source: 'owned' })
  | (ExternalAlbumBase & { source: 'external' });

const ESTIMATED_ROW_HEIGHT = 80;

const normalizeKey = (artist: string, title: string) =>
  `${artist}:${title}`.toLowerCase().trim();

const ArtistContent: React.FC<Props> = ({ artist, onRefresh, isRefreshing }) => {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();

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
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 140,
        backgroundColor: isDarkMode ? '#000' : '#fff',
      }}
      onRefresh={onRefresh}
      refreshing={isRefreshing}
    />
  )
}
