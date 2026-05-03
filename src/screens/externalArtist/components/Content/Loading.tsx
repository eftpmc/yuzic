import React, { useMemo } from 'react'
import { FlashList } from '@shopify/flash-list'
import LoadingExternalArtistHeader from '../Header/Loading'
import LoadingExternalAlbumRow from '@/components/rows/ExternalAlbumRow/Loading'

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
      ListHeaderComponent={<LoadingExternalArtistHeader />}
      renderItem={() => <LoadingExternalAlbumRow />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 140 }}
    />
  )
}
