import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

import LoadingHeader from '../Header/Loading';
import LoadingSongRow from '@/components/SongRow/Loading';

const ESTIMATED_ROW_HEIGHT = 72;
const PLACEHOLDER_ROWS = 8;

const LoadingAlbumContent: React.FC = () => {
  /**
   * Static placeholder data
   */
  const data = useMemo(
    () => Array.from({ length: PLACEHOLDER_ROWS }),
    []
  );

  const header = useMemo(() => {
    return <LoadingHeader />;
  }, []);

  const renderItem = ({ index }: { index: number }) => {
    return <LoadingSongRow key={index} />;
  };

  return (
    <FlashList
      data={data}
      keyExtractor={(_, index) => `skeleton-${index}`}
      renderItem={renderItem}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default LoadingAlbumContent;