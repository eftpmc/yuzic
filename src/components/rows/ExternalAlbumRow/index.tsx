import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { ExternalAlbumBase } from '@/types';
import ExternalAlbumOptions from '@/components/options/ExternalAlbumOptions';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  album: ExternalAlbumBase;
  artistName: string;
  onPress?: (album: ExternalAlbumBase) => void;
};

const ExternalAlbumRow: React.FC<Props> = ({
  album,
  artistName,
  onPress,
}) => {
  const { isDarkMode } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={styles.albumItem}>
        <TouchableOpacity
          style={styles.albumContent}
          onPress={() => onPress?.(album)}
        >
          <MediaImage
            cover={album.cover}
            size="thumb"
            style={styles.cover}
          />

          <View style={styles.albumTextContainer}>
            <Text
              numberOfLines={1}
              style={[
                styles.albumTitle,
                isDarkMode && styles.albumTitleDark,
              ]}
            >
              {album.title}
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.albumSubtext,
                isDarkMode && styles.albumSubtextDark,
              ]}
            >
              {album.subtext}
            </Text>
          </View>
        </TouchableOpacity>

        <ExternalAlbumOptions
          selectedAlbumTitle={album.title}
          selectedAlbumArtist={artistName}
        />
      </View>
    </View>
  );
};

export default ExternalAlbumRow;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: 6,
  },
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  albumContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  albumTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  albumTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  albumTitleDark: {
    color: '#fff',
  },
  albumSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  albumSubtextDark: {
    color: '#aaa',
  },
});