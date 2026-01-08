import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

import LoadingArtistHeader from '../Header/Loading';
import LoadingAlbumRow from '@/components/AlbumRow/Loading';

const ESTIMATED_ROW_HEIGHT = 80;
const PLACEHOLDER_ROWS = 6;

const LoadingArtistContent: React.FC = () => {
  const data = useMemo(
    () => Array.from({ length: PLACEHOLDER_ROWS }),
    []
  );

  return (
    <FlashList
      data={data}
      keyExtractor={(_, index) => `artist-loading-${index}`}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      ListHeaderComponent={<LoadingArtistHeader />}
      renderItem={({ index }) => <LoadingAlbumRow key={index} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 140,
      }}
    />
  );
};

export default LoadingArtistContent;