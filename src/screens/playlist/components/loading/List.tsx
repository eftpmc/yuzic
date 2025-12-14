import React, { useMemo } from 'react';
import { FlashList } from '@shopify/flash-list';

import LHeader from './Header';
import LSongRow from '@/components/loading/SongRow';

const ESTIMATED_ROW_HEIGHT = 72;
const PLACEHOLDER_ROWS = 8;

const LList: React.FC = () => {
  const data = useMemo(
    () => Array.from({ length: PLACEHOLDER_ROWS }),
    []
  );

  const header = useMemo(() => {
    return <LHeader />;
  }, []);

  const renderItem = ({ index }: { index: number }) => (
    <LSongRow key={index} />
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

export default LList;