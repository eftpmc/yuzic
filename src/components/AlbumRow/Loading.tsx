import React from 'react';
import {
  View,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Skeleton } from 'moti/skeleton';

const LoadingAlbumRow: React.FC = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const colorMode = isDarkMode ? 'dark' : 'light';

  return (
    <View style={styles.wrapper}>
      <View style={styles.albumItem}>
        {/* Cover art */}
        <Skeleton
          width={64}
          height={64}
          radius={8}
          colorMode={colorMode}
        />

        {/* Title + subtitle */}
        <View style={styles.albumTextContainer}>
          <Skeleton
            width="70%"
            height={16}
            radius={6}
            colorMode={colorMode}
          />

          <View style={{ height: 6 }} />

          <Skeleton
            width="50%"
            height={14}
            radius={6}
            colorMode={colorMode}
          />
        </View>

        {/* Options / status */}
        <Skeleton
          width={20}
          height={20}
          radius={10}
          colorMode={colorMode}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
  },

  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },

  albumTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
});

export default LoadingAlbumRow;