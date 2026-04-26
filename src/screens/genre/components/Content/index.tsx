import React, { useMemo } from 'react'
import { FlashList } from '@shopify/flash-list'
import { useNavigation } from '@react-navigation/native'
import { useDownload } from '@/contexts/DownloadContext'

import { Album } from '@/types'
import { useTheme } from '@/hooks/useTheme'
import { useTracks } from '@/hooks/tracks'
import {
  buildDownloadedTrackIdSet,
  getFullyDownloadedAlbumIds,
} from '@/utils/downloads/collectionState'
import AlbumRow from '@/components/rows/AlbumRow'
import ListSeparator from '@/components/ListSeparator'
import GenreHeader from '../Header'

type Props = {
  genre: string
  albums: Album[]
}

const ESTIMATED_ROW_HEIGHT = 80

export default function GenreContent({ genre, albums }: Props) {
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
          showDownloadedDot
          isDownloaded={downloadedAlbumIds.has(String(item.id))}
          onPress={(album) => navigation.navigate('albumView', { id: album.id })}
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
