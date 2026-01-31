import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import { PlaylistBase, Playlist } from '@/types';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import { usePlaylist } from '@/hooks/playlists';
import PlaylistOptions from '@/components/options/PlaylistOptions';

type Props = {
  playlist: PlaylistBase;
  onPress?: (playlist: PlaylistBase) => void;
};

const PlaylistRow: React.FC<Props> = ({ playlist, onPress }) => {
  const { isDarkMode } = useTheme();
  const optionsSheetRef = useRef<BottomSheetModal>(null);
  const { playlist: fullPlaylist } = usePlaylist(playlist.id);
  const [playlistForSheet, setPlaylistForSheet] = useState<Playlist | null>(null);

  const handleOptionsPress = useCallback(() => {
    if (fullPlaylist) {
      setPlaylistForSheet(fullPlaylist);
      optionsSheetRef.current?.present();
    }
  }, [fullPlaylist]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.rowItem}>
        <TouchableOpacity
          style={styles.rowContent}
          onPress={() => onPress?.(playlist)}
        >
          <MediaImage
            cover={playlist.cover}
            size="grid"
            style={styles.cover}
          />

          <View style={styles.textContainer}>
            <Text
              numberOfLines={1}
              style={[
                styles.title,
                isDarkMode && styles.titleDark,
              ]}
            >
              {playlist.title}
            </Text>

            <Text
              numberOfLines={1}
              style={[
                styles.subtext,
                isDarkMode && styles.subtextDark,
              ]}
            >
              {playlist.subtext}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            onPress={handleOptionsPress}
            style={styles.optionButton}
          >
            <Ionicons
              name="ellipsis-horizontal"
              size={24}
              color={isDarkMode ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        </View>
      </View>

      <PlaylistOptions
        ref={optionsSheetRef}
        playlist={playlistForSheet}
        hideGoToPlaylist={false}
      />
    </View>
  );
};

export default PlaylistRow;

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
  },
  cover: {
    width: 64,
    height: 64,
    borderRadius: 6,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  titleDark: {
    color: '#fff',
  },
  subtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  subtextDark: {
    color: '#aaa',
  },
  optionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionButton: {
    padding: 8,
  },
});
