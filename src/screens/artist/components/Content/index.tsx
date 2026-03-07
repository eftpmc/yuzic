import React from 'react'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useDownloadedTracks } from 'react-native-nitro-player'
import type { Artist } from '@/types'
import AlbumRow from '@/components/rows/AlbumRow'
import ListSeparator from '@/components/ListSeparator'
import Header from '../Header'
import { useTheme } from '@/hooks/useTheme'
import { useTracks } from '@/hooks/tracks'
import {
  buildDownloadedTrackIdSet,
  getFullyDownloadedAlbumIds,
} from '@/utils/downloads/collectionState'
type Props = {
  artist: Artist
}

const ESTIMATED_ROW_HEIGHT = 80

export default function ArtistContent({ artist }: Props) {
  const navigation = useNavigation()
  const { isDarkMode } = useTheme()
  const { tracks } = useTracks()
  const downloadedState = useDownloadedTracks() as any

  const downloadedTrackIds = React.useMemo(
    () => buildDownloadedTrackIdSet(downloadedState?.downloadedTracks ?? []),
    [downloadedState?.downloadedTracks]
  )
  const downloadedAlbumIds = React.useMemo(
    () => getFullyDownloadedAlbumIds(tracks, downloadedTrackIds),
    [tracks, downloadedTrackIds]
  )

  return (
    <FlashList
      data={artist.ownedAlbums}
      keyExtractor={(item) => item.id}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      ListHeaderComponent={<Header artist={artist} />}
      renderItem={({ item }) => (
        <AlbumRow
          album={item}
          showDownloadedDot
          isDownloaded={downloadedAlbumIds.has(String(item.id))}
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
