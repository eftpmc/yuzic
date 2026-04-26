import React from 'react'
import { Platform } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useDownload } from '@/contexts/DownloadContext'
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
  const navigation = useNavigation<any>()
  const { isDarkMode } = useTheme()
  const { tracks } = useTracks()
  const { getAllDownloadedTracks } = useDownload()

  const downloadedTrackIds = React.useMemo(
    () => buildDownloadedTrackIdSet(getAllDownloadedTracks()),
    [getAllDownloadedTracks]
  )
  const downloadedAlbumIds = React.useMemo(
    () => getFullyDownloadedAlbumIds(tracks, downloadedTrackIds),
    [tracks, downloadedTrackIds]
  )

  return (
    <FlashList
      data={artist.ownedAlbums}
      keyExtractor={(item) => item.id}
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
        paddingBottom: Platform.OS === 'android' ? 180 : 140,
        backgroundColor: isDarkMode ? '#000' : '#fff',
      }}
    />
  )
}
