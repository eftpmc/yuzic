import React, { memo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Song } from '@/types';
import SongOptions from '@/components/options/SongOptions';
import PlaylistList from '@/components/PlaylistList';
import { usePlayingActions } from '@/contexts/PlayingContext';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useDownload } from '@/contexts/DownloadContext';
import { useSheetRef } from '@/utils/useSheetRef';

type Props = {
  song: Song;
  collection?: any;
  onPress?: () => void;
  variant?: 'default' | 'albumCompact';
  showDownloadedDot?: boolean;
  isFavorite?: boolean;
};

function formatDuration(duration?: number): string {
  if (!duration) return '';
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

const SongRow: React.FC<Props> = ({
  song,
  collection,
  onPress,
  variant = 'default',
  showDownloadedDot = false,
  isFavorite = false,
}) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { playSongInCollection } = usePlayingActions();
  const { isTrackDownloaded } = useDownload();
  const isAlbumCompact = variant === 'albumCompact';
  const downloaded = isTrackDownloaded(song.id);

  const optionsRef = useSheetRef();
  const playlistRef = useSheetRef();

  const [playlistSong, setPlaylistSong] = useState<Song | null>(null);

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress();
      return;
    }
    if (collection) {
      playSongInCollection(song, collection, false);
    }
  }, [onPress, collection, song, playSongInCollection]);

  const openOptions = useCallback(() => {
    optionsRef.current?.present();
  }, [optionsRef]);

  const openPlaylistList = useCallback(() => {
    optionsRef.current?.dismiss();
    setPlaylistSong(song);
    requestAnimationFrame(() => {
      playlistRef.current?.present();
    });
  }, [optionsRef, playlistRef, song]);

  const closePlaylistList = useCallback(() => {
    playlistRef.current?.dismiss();
    setPlaylistSong(null);
  }, [playlistRef]);

  const themeStyles = isDarkMode ? stylesDark : stylesLight;

  return (
    <>
      <View style={[styles.row, isAlbumCompact && styles.rowAlbumCompact]}>
        <TouchableOpacity
          style={styles.songInfo}
          onPress={handlePress}
          disabled={!onPress && !collection}
        >
          {!isAlbumCompact && (
            <View style={styles.defaultLeading}>
              <MediaImage
                cover={song.cover}
                size="thumb"
                style={styles.cover}
              />
            </View>
          )}

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
              {song.artist || t('songOptions.unknownArtist')}
              {!isAlbumCompact && ` • ${formatDuration(Number(song.duration))}`}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.rowRight}>
          {isFavorite && (
            <Ionicons
              name="heart"
              size={15}
              color="#ff4d67"
            />
          )}
          {downloaded && (isAlbumCompact || showDownloadedDot) && (
            <Ionicons
              name="arrow-down-circle"
              size={16}
              color={isDarkMode ? '#aaa' : '#8e8e93'}
            />
          )}
          <TouchableOpacity onPress={openOptions} hitSlop={10}>
            <Ionicons
              name="ellipsis-horizontal"
              size={18}
              color={isDarkMode ? '#fff' : '#000'}
            />
          </TouchableOpacity>
        </View>
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
  rowAlbumCompact: {
    paddingVertical: 13,
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
    marginRight: 0,
  },
  defaultLeading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trackNumber: {
    fontSize: 13,
    minWidth: 16,
  },
  title: {
    fontSize: 15,
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
  trackNumber: {
    color: '#666',
  },
  subtitle: {
    color: '#666',
  },
});

const stylesDark = StyleSheet.create({
  title: {
    color: '#fff',
  },
  trackNumber: {
    color: '#aaa',
  },
  subtitle: {
    color: '#aaa',
  },
});

export default memo(SongRow);
