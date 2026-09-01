import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

import LoadingPlaylistHeader from '../Header/Loading';
import LoadingSongRow from '@/components/rows/SongRow/Loading';
import { spacing } from '@/constants/design';

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
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingBottom: spacing.scrollClearance }}
      showsVerticalScrollIndicator={false}
    />
  );
};

export default LoadingPlaylistContent;
