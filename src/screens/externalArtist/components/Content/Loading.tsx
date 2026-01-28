import React, { useMemo } from 'react'
import { FlashList } from '@shopify/flash-list'
import LoadingExternalArtistHeader from '../Header/Loading'
import LoadingAlbumRow from '@/components/rows/AlbumRow/Loading'

const ESTIMATED_ROW_HEIGHT = 80
const PLACEHOLDER_ROWS = 6

export default function LoadingExternalArtistContent() {
  const data = useMemo(
    () => Array.from({ length: PLACEHOLDER_ROWS }),
    []
  )

  return (
    <FlashList
      data={data}
      keyExtractor={(_, i) => `external-artist-loading-${i}`}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      ListHeaderComponent={<LoadingExternalArtistHeader />}
      renderItem={() => <LoadingAlbumRow />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 140 }}
    />
  )
}
