import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

import LoadingAlbumHeader from '../Header/Loading';
import LoadingExternalSongRow from '@/components/rows/ExternalSongRow/Loading';

const PLACEHOLDER_ROWS = 8;

const LoadingExternalAlbumContent: React.FC = () => {
  const data = useMemo(
    () => Array.from({ length: PLACEHOLDER_ROWS }),
    []
  );

  return (
    <FlashList
      data={data}
      keyExtractor={(_, index) => `skeleton-${index}`}
      renderItem={() => <LoadingExternalSongRow />}
      ListHeaderComponent={<LoadingAlbumHeader />}
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default LoadingExternalAlbumContent;
