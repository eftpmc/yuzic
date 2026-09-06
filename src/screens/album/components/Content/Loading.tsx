import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

import LoadingHeader from '../Header/Loading';
import LoadingSongRow from '@/components/rows/SongRow/Loading';
import { useScrollClearance } from '@/hooks/useScrollClearance';

const PLACEHOLDER_ROWS = 8;

const LoadingAlbumContent: React.FC = () => {
  const scrollClearance = useScrollClearance();
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
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: scrollClearance }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default LoadingAlbumContent;
