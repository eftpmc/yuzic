import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal } from '@gorhom/bottom-sheet';

import { Song } from '@/types';
import SongOptions from '@/components/options/SongOptions';
import PlaylistList from '@/components/PlaylistList';
import { usePlaying } from '@/contexts/PlayingContext';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  song: Song;
  collection?: any;
  onPress?: () => void;
};

const SongRow: React.FC<Props> = ({ song, collection, onPress }) => {
  const { isDarkMode } = useTheme();
  const { playSongInCollection } = usePlaying();

  const optionsRef = useRef<BottomSheetModal>(null);
  const playlistRef = useRef<BottomSheetModal>(null);

  const [playlistSong, setPlaylistSong] = useState<Song | null>(null);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    if (collection) {
      playSongInCollection(song, collection);
    }
  };

  const openOptions = () => {
    optionsRef.current?.present();
  };

  const openPlaylistList = () => {
    optionsRef.current?.dismiss();
    setPlaylistSong(song);
    requestAnimationFrame(() => {
      playlistRef.current?.present();
    });
  };

  const closePlaylistList = () => {
    playlistRef.current?.dismiss();
    setPlaylistSong(null);
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const themeStyles = isDarkMode ? stylesDark : stylesLight;

  return (
    <>
      <View style={styles.row}>
        <TouchableOpacity
          style={styles.songInfo}
          onPress={handlePress}
          disabled={!onPress && !collection}
        >
          <MediaImage
            cover={song.cover}
            size="thumb"
            style={styles.cover}
          />

          <View style={styles.textContainer}>
            <Text
              style={[styles.title, themeStyles.title]}
              numberOfLines={1}
            >
              {song.title}
            </Text>

            <Text
              style={[styles.subtitle, themeStyles.subtitle]}
              numberOfLines={1}
            >
              {song.artist || 'Unknown'} •{' '}
              {formatDuration(Number(song.duration))}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={openOptions} hitSlop={10}>
          <Ionicons
            name="ellipsis-horizontal"
            size={18}
            color={isDarkMode ? '#fff' : '#000'}
          />
        </TouchableOpacity>
      </View>

      <SongOptions
        ref={optionsRef}
        selectedSong={song}
        onAddToPlaylist={openPlaylistList}
      />

      <PlaylistList
        ref={playlistRef}
        selectedSong={playlistSong}
        onClose={closePlaylistList}
      />
    </>
  );
};

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
    marginRight: 12,
  },
  cover: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '400',
  },
  subtitle: {
    fontSize: 13,
  },
});

const stylesLight = StyleSheet.create({
  title: {
    color: '#000',
  },
  subtitle: {
    color: '#666',
  },
});

const stylesDark = StyleSheet.create({
  title: {
    color: '#fff',
  },
  subtitle: {
    color: '#aaa',
  },
});

export default SongRow;