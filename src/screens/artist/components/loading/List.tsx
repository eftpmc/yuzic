import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

import LHeader from './Header';
import LAlbumRow from '@/components/loading/AlbumRow';

const ESTIMATED_ROW_HEIGHT = 80;
const PLACEHOLDER_ROWS = 6;

const LList: React.FC = () => {
  const data = useMemo(
    () => Array.from({ length: PLACEHOLDER_ROWS }),
    []
  );

  return (
    <FlashList
      data={data}
      keyExtractor={(_, index) => `artist-loading-${index}`}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      ListHeaderComponent={<LHeader />}
      renderItem={({ index }) => <LAlbumRow key={index} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{
        paddingBottom: 140,
      }}
    />
  );
};

export default LList;