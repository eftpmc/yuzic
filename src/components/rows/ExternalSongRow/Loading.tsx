import React from 'react';
import {
  View,
  StyleSheet,
} from 'react-native';
import { Skeleton } from 'moti/skeleton';
import { useTheme } from '@/hooks/useTheme';

const LoadingExternalSongRow: React.FC = () => {
  const { isDarkMode } = useTheme();
  const colorMode = isDarkMode ? 'dark' : 'light';

  return (
    <View style={styles.row}>
      <View style={styles.songInfo}>
        {/* Cover */}
        <Skeleton
          width={44}
          height={44}
          radius={6}
          colorMode={colorMode}
        />

        <View style={styles.textContainer}>
          {/* Title */}
          <Skeleton
            width="70%"
            height={16}
            radius={6}
            colorMode={colorMode}
          />

          {/* Subtitle */}
          <View style={{ marginTop: 6 }}>
            <Skeleton
              width="50%"
              height={14}
              radius={6}
              colorMode={colorMode}
            />
          </View>
        </View>
      </View>
    </View>
  );
};

export default LoadingExternalSongRow;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  songInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
});
