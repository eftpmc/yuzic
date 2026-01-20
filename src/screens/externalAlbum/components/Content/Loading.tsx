import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

import LoadingAlbumHeader from '../Header/Loading';
import LoadingSongRow from '@/components/rows/SongRow/Loading';

const ESTIMATED_ROW_HEIGHT = 72;
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
      renderItem={() => <LoadingSongRow />}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      ListHeaderComponent={<LoadingAlbumHeader />}
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default LoadingExternalAlbumContent;