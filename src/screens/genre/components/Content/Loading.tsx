import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

import LoadingGenreHeader from '../Header/Loading';
import SkeletonListRow from '@/components/SkeletonListRow';

const PLACEHOLDER_ROWS = 6;

const LoadingGenreContent: React.FC = () => {
  const data = useMemo(() => Array.from({ length: PLACEHOLDER_ROWS }), []);

  return (
    <FlashList
      data={data}
      keyExtractor={(_, index) => `genre-loading-${index}`}
      ListHeaderComponent={<LoadingGenreHeader />}
      renderItem={({ index }) => <SkeletonListRow key={index} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 140,
      }}
    />
  );
};

export default LoadingGenreContent;
