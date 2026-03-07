import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '@/hooks/useTheme';

const LoadingPlaylistHeader: React.FC = () => {
  const { isDarkMode } = useTheme();
  const colorMode = isDarkMode ? 'dark' : 'light';

  return (
    <View style={styles.container}>
      {/* Top controls */}
      <View style={styles.headerRow}>
        {/* Back button */}
        <Skeleton
          width={24}
          height={24}
          radius={4}
          colorMode={colorMode}
        />

        {/* Download button */}
        <Skeleton
          width={24}
          height={24}
          radius={4}
          colorMode={colorMode}
        />
      </View>

      {/* Cover art */}
      <View style={styles.coverWrapper}>
        <Skeleton
          width={280}
          height={280}
          radius={16}
          colorMode={colorMode}
        />
      </View>

      {/* Title + metadata */}
      <View style={styles.titleInfo}>
        <Skeleton
          width="72%"
          height={24}
          radius={6}
          colorMode={colorMode}
        />

        <View style={styles.metaRow}>
          <Skeleton
            width={58}
            height={14}
            radius={6}
            colorMode={colorMode}
          />
          <Skeleton
            width={8}
            height={8}
            radius={4}
            colorMode={colorMode}
          />
          <Skeleton
            width={88}
            height={14}
            radius={6}
            colorMode={colorMode}
          />
          <Skeleton
            width={8}
            height={8}
            radius={4}
            colorMode={colorMode}
          />
          <Skeleton
            width={52}
            height={14}
            radius={6}
            colorMode={colorMode}
          />
        </View>
      </View>

      {/* Controls row */}
      <View style={styles.actionsRow}>
        <View style={styles.actions}>
          <Skeleton
            width={40}
            height={40}
            radius={20}
            colorMode={colorMode}
          />
          <Skeleton
            width={112}
            height={48}
            radius={22}
            colorMode={colorMode}
          />
          <Skeleton
            width={40}
            height={40}
            radius={20}
            colorMode={colorMode}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  headerRow: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  coverWrapper: {
    width: 280,
    height: 280,
    borderRadius: 16,
    marginTop: 32,
    marginBottom: 24,
    overflow: 'hidden',
  },
  titleInfo: {
    width: '100%',
    marginBottom: 12,
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 8,
  },
  actionsRow: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
});

export default LoadingPlaylistHeader;