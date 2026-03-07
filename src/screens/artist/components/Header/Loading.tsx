import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '@/hooks/useTheme';

const LoadingArtistHeader: React.FC = () => {
  const { isDarkMode } = useTheme();
  const colorMode = isDarkMode ? 'dark' : 'light';

  return (
    <>
      {/* FULL BLEED BACKGROUND */}
      <View style={styles.fullBleedWrapper}>
        <Skeleton
          width="100%"
          height={300}
          colorMode={colorMode}
        />

        {/* CENTERED ARTIST IMAGE */}
        <View style={styles.centeredCoverContainer}>
          <Skeleton
            width={120}
            height={120}
            radius={60}
            colorMode={colorMode}
          />
        </View>
      </View>

      {/* ARTIST META */}
      <View style={{ paddingHorizontal: 16 }}>
        <View style={styles.content}>
          <Skeleton
            width={180}
            height={28}
            radius={6}
            colorMode={colorMode}
          />

          <View style={styles.metaRow}>
            <Skeleton
              width={70}
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
              width={70}
              height={14}
              radius={6}
              colorMode={colorMode}
            />
          </View>
        </View>
      </View>

      {/* SHUFFLE / PLAY / DOWNLOAD */}
      <View style={styles.buttonRow}>
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
    </>
  );
};

const styles = StyleSheet.create({
  fullBleedWrapper: {
    width: '100%',
    height: 300,
    justifyContent: 'flex-end',
    alignItems: 'center',
    overflow: 'hidden',
  },

  centeredCoverContainer: {
    position: 'absolute',
    bottom: -32,
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
});

export default LoadingArtistHeader;