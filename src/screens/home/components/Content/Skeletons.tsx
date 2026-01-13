import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '@/hooks/useTheme';

export function LibraryListSkeleton({ count = 8 }: { count?: number }) {
  const { isDarkMode } = useTheme();

  return (
    <View style={styles.listContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.listRow}>
          <Skeleton
            width={48}
            height={48}
            radius={6}
            colorMode={isDarkMode ? 'dark' : 'light'}
          />

          <View style={styles.listText}>
            <Skeleton
              width="70%"
              height={14}
              radius={4}
              colorMode={isDarkMode ? 'dark' : 'light'}
            />
            <View style={{ height: 6 }} />
            <Skeleton
              width="40%"
              height={12}
              radius={4}
              colorMode={isDarkMode ? 'dark' : 'light'}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

export function LibraryGridSkeleton({
  columns,
  itemWidth,
  count = 12,
}: {
  columns: number;
  itemWidth: number;
  count?: number;
}) {
  const { isDarkMode } = useTheme();

  return (
    <View style={styles.gridContainer}>
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.gridItem,
            { width: itemWidth },
          ]}
        >
          <Skeleton
            width="100%"
            height={itemWidth}
            radius={8}
            colorMode={isDarkMode ? 'dark' : 'light'}
          />

          <View style={{ height: 6 }} />

          <Skeleton
            width="80%"
            height={12}
            radius={4}
            colorMode={isDarkMode ? 'dark' : 'light'}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  listText: {
    flex: 1,
    marginLeft: 12,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingTop: 12,
  },
  gridItem: {
    marginHorizontal: 8,
    marginBottom: 16,
  },
});
