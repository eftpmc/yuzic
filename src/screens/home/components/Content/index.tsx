import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { LibraryGridSkeleton, LibraryListSkeleton } from './Skeletons';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { usePrefetchCovers } from '@/hooks/usePrefetchCovers';
import { prefetchCovers } from '@/utils/images/imageCache';
import type { CoverSource } from '@/types';

type Props<T> = {
  data: T[];
  isLoading: boolean;
  isGridView: boolean;
  gridColumns: number;
  gridItemWidth: number;
  estimatedItemSize?: number;
  renderItem: ListRenderItem<T>;
  ListHeaderComponent?: React.ReactElement | null;
  onEndReached?: () => void;
  hasMore?: boolean;
};

export default function LibraryContent<T>({
  data,
  isLoading,
  isGridView,
  gridColumns,
  gridItemWidth,
  renderItem,
  ListHeaderComponent,
  onEndReached,
  hasMore,
}: Props<T>) {
  const { isDarkMode } = useTheme();
  const { t } = useTranslation();
  const prefetchSize = isGridView ? 'grid' : 'thumb';
  const initialCovers = useMemo(
    () => data.slice(0, isGridView ? gridColumns * 4 : 18).map(getItemCover),
    [data, gridColumns, isGridView]
  );

  usePrefetchCovers(initialCovers, prefetchSize);

  const handleViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: { item: T }[] }) => {
    prefetchCovers(viewableItems.map(({ item }) => getItemCover(item)), prefetchSize);
  }, [prefetchSize]);

  if (isLoading) {
    return isGridView ? (
      <LibraryGridSkeleton columns={gridColumns} itemWidth={gridItemWidth} />
    ) : (
      <LibraryListSkeleton />
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="folder-open-outline"
          size={80}
          color={isDarkMode ? '#555' : '#999'}
        />
        <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
          {t('home.empty')}
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={data}
      key={isGridView ? `grid-${gridColumns}` : 'list'}
      numColumns={isGridView ? gridColumns : 1}
      keyExtractor={(item: any, index) => {
        const rawId = item?.id != null ? String(item.id) : `idx-${index}`;
        const rawType = item?.type ?? item?.entityType ?? item?.kind ?? 'item';
        return `${String(rawType)}:${rawId}`;
      }}
      contentContainerStyle={{ paddingBottom: 150, paddingHorizontal: 8 }}
      ListHeaderComponent={ListHeaderComponent}
      renderItem={renderItem}
      onViewableItemsChanged={handleViewableItemsChanged}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 35,
        minimumViewTime: 80,
      }}
      showsVerticalScrollIndicator={false}
      onEndReached={hasMore ? onEndReached : undefined}
      onEndReachedThreshold={0.5}
    />
  );
}

function getItemCover(item: unknown): CoverSource | null {
  if (!item || typeof item !== 'object') return null;
  const cover = (item as { cover?: CoverSource }).cover;
  return cover ?? null;
}

const styles = StyleSheet.create({
  loaderContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 150,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
  },
  emptyTextDark: {
    color: '#ccc',
  },
});
