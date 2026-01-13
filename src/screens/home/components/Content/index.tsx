import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { LibraryGridSkeleton, LibraryListSkeleton } from './Skeletons';
import { useTheme } from '@/hooks/useTheme';

type Props<T> = {
  data: T[];
  isLoading: boolean;
  isGridView: boolean;
  gridColumns: number;
  gridItemWidth: number;
  estimatedItemSize: number;
  renderItem: ListRenderItem<T>;
  ListHeaderComponent?: React.ReactElement | null;
};

export default function LibraryContent<T>({
  data,
  isLoading,
  isGridView,
  gridColumns,
  gridItemWidth,
  estimatedItemSize,
  renderItem,
  ListHeaderComponent,
}: Props<T>) {
  const { isDarkMode } = useTheme();

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
          No content available.
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={data}
      estimatedItemSize={estimatedItemSize}
      key={isGridView ? `grid-${gridColumns}` : 'list'}
      numColumns={isGridView ? gridColumns : 1}
      keyExtractor={(item: any) => item.id}
      contentContainerStyle={{ paddingBottom: 150 }}
      ListHeaderComponent={ListHeaderComponent}
      renderItem={renderItem}
      showsVerticalScrollIndicator={false}
    />
  );
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