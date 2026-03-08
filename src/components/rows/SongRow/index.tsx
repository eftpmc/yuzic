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
import { useTranslation } from 'react-i18next';
import { useDownload } from '@/contexts/DownloadContext';

type Props = {
  song: Song;
  collection?: any;
  selectedIndex?: number;
  onPress?: () => void;
  variant?: 'default' | 'albumCompact';
  trackNumber?: number;
  showDownloadedDot?: boolean;
};

const SongRow: React.FC<Props> = ({
  song,
  collection,
  selectedIndex,
  onPress,
  variant = 'default',
  trackNumber,
  showDownloadedDot = false,
}) => {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const { playSongInCollection } = usePlaying();
  const { isTrackDownloaded } = useDownload();
  const isAlbumCompact = variant === 'albumCompact';
  const downloaded = isTrackDownloaded(song.id);

  const optionsRef = useRef<BottomSheetModal>(null);
  const playlistRef = useRef<BottomSheetModal>(null);

  const [playlistSong, setPlaylistSong] = useState<Song | null>(null);

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    if (collection) {
      playSongInCollection(song, collection, false, selectedIndex);
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
      <View style={[styles.row, isAlbumCompact && styles.rowAlbumCompact]}>
        <TouchableOpacity
          style={styles.songInfo}
          onPress={handlePress}
          disabled={!onPress && !collection}
        >
          {isAlbumCompact ? (
            <View style={styles.leadingMeta}>
              <View
                style={[
                  styles.downloadDot,
                  downloaded ? styles.downloadDotVisible : styles.downloadDotHidden,
                ]}
              />
              <Text style={[styles.trackNumber, themeStyles.trackNumber]}>
                {String(trackNumber ?? '')}
              </Text>
            </View>
          ) : (
            <View style={styles.defaultLeading}>
              {showDownloadedDot && (
                <View
                  style={[
                    styles.downloadDot,
                    styles.downloadDotForDefault,
                    downloaded ? styles.downloadDotVisible : styles.downloadDotHidden,
                  ]}
                />
              )}
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

            {!isAlbumCompact && (
              <Text
                style={[styles.subtitle, themeStyles.subtitle]}
                numberOfLines={1}
              >
                {song.artist || t('songOptions.unknownArtist')} •{' '}
                {formatDuration(Number(song.duration))}
              </Text>
            )}
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
  leadingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 44,
    marginRight: 4,
  },
  downloadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  downloadDotForDefault: {
    marginRight: 8,
  },
  downloadDotVisible: {
    backgroundColor: '#8e8e93',
  },
  downloadDotHidden: {
    backgroundColor: 'transparent',
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

export default SongRow;