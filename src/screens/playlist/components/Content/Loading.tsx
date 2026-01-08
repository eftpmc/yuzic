import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

import LoadingPlaylistHeader from '../Header/Loading';
import LoadingSongRow from '@/components/SongRow/Loading';

const ESTIMATED_ROW_HEIGHT = 72;
const PLACEHOLDER_ROWS = 8;

const LoadingPlaylistContent: React.FC = () => {
  const data = useMemo(
    () => Array.from({ length: PLACEHOLDER_ROWS }),
    []
  );

  const header = useMemo(() => {
    return <LoadingPlaylistHeader />;
  }, []);

  const renderItem = ({ index }: { index: number }) => (
    <LoadingSongRow key={index} />
  );

  return (
    <FlashList
      data={data}
      keyExtractor={(_, index) => `playlist-loading-${index}`}
      renderItem={renderItem}
      estimatedItemSize={ESTIMATED_ROW_HEIGHT}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default LoadingPlaylistContent;