import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

import LoadingArtistHeader from '../Header/Loading';
import SkeletonListRow from '@/components/SkeletonListRow';

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
      ListHeaderComponent={<LoadingArtistHeader />}
      renderItem={({ index }) => <SkeletonListRow key={index} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 140,
      }}
    />
  );
};

export default LoadingArtistContent;
