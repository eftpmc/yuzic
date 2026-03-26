import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '@/hooks/useTheme';

const LoadingExternalAlbumHeader: React.FC = () => {
  const { isDarkMode } = useTheme();
  const colorMode = isDarkMode ? 'dark' : 'light';

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Skeleton
          width={24}
          height={24}
          radius={4}
          colorMode={colorMode}
        />

        <Skeleton
          width={24}
          height={24}
          radius={4}
          colorMode={colorMode}
        />
      </View>

      <View style={styles.coverWrapper}>
        <Skeleton
          width={280}
          height={280}
          radius={16}
          colorMode={colorMode}
        />
      </View>

      <View style={styles.titleInfo}>
        <Skeleton
          width="70%"
          height={24}
          radius={6}
          colorMode={colorMode}
        />

        <View style={styles.metaRow}>
          <View style={styles.artistRow}>
            <Skeleton
              width={20}
              height={20}
              radius={10}
              colorMode={colorMode}
            />
            <View style={{ width: 8 }} />
            <Skeleton
              width={120}
              height={14}
              radius={6}
              colorMode={colorMode}
            />
          </View>
          <View style={{ width: 8 }} />
          <Skeleton
            width={150}
            height={14}
            radius={6}
            colorMode={colorMode}
          />
        </View>
      </View>

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

export default LoadingExternalAlbumHeader;

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
    alignItems: 'center',
    marginBottom: 12,
  },
  artistRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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