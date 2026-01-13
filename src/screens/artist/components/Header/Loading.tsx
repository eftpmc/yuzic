import React from 'react';
import {
  View,
  StyleSheet,
  Platform,
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
          {/* Artist name */}
          <Skeleton
            width={180}
            height={28}
            radius={6}
            colorMode={colorMode}
          />

          {/* Bio */}
          <View style={{ marginTop: 12 }}>
            <Skeleton
              width="90%"
              height={14}
              radius={6}
              colorMode={colorMode}
            />
            <View style={{ height: 8 }} />
            <Skeleton
              width="75%"
              height={14}
              radius={6}
              colorMode={colorMode}
            />
          </View>
        </View>
      </View>

      {/* PLAY / SHUFFLE */}
      <View style={styles.buttonRow}>
        <Skeleton
          width={110}
          height={40}
          radius={8}
          colorMode={colorMode}
        />
        <Skeleton
          width={110}
          height={40}
          radius={8}
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

  header: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    zIndex: 20,
  },

  content: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 24,
  },
});

export default LoadingArtistHeader;