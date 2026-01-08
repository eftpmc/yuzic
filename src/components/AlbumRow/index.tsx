import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Album } from '@/types';
import AlbumOptions from '@/components/options/AlbumOptions';
import ExternalAlbumOptions from '@/components/options/ExternalAlbumOptions';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { MediaImage } from '@/components/MediaImage';

type CombinedAlbum = Album & {
  isExternal?: boolean;
};

type Props = {
  album: CombinedAlbum;
  artistName: string;
  onPress?: (album: CombinedAlbum) => void;
};

const AlbumRow: React.FC<Props> = ({ album, artistName, onPress }) => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColor = useSelector(selectThemeColor);

  return (
    <View style={styles.wrapper}>
      <View style={styles.albumItem}>
        <TouchableOpacity
          style={styles.albumContent}
          disabled={album.isExternal}
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

        <View style={styles.optionsContainer}>
          {!album.isExternal && (
            <MaterialIcons
              name="check-circle"
              size={20}
              color={themeColor}
              style={{ marginRight: 8 }}
            />
          )}

          {album.isExternal ? (
            <ExternalAlbumOptions
              selectedAlbumTitle={album.title}
              selectedAlbumArtist={artistName}
            />
          ) : (
            <AlbumOptions selectedAlbumId={album.id} />
          )}
        </View>
      </View>
    </View>
  );
};

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

  optionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

export default AlbumRow;