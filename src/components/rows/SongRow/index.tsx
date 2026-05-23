import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Heart, ArrowDownCircle, Ellipsis } from 'lucide-react-native';

import { Song } from '@/types';
import SongOptions from '@/components/options/SongOptions';
import PlaylistList from '@/components/PlaylistList';
import { usePlayingActions } from '@/contexts/PlayingContext';
import { MediaImage } from '@/components/MediaImage';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useDownloadState } from '@/contexts/DownloadContext';
import { useSheetRef } from '@/utils/useSheetRef';
import { formatSongDuration } from '@/utils/formatDuration';

type Props = {
  song: Song;
  collection?: any;
  onPress?: () => void;
  variant?: 'default' | 'albumCompact';
  showDownloadedDot?: boolean;
  isFavorite?: boolean;
};

const SongRow: React.FC<Props> = ({
  song,
  collection,
  onPress,
  variant = 'default',
  showDownloadedDot = false,
  isFavorite = false,
}) => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { playSongInCollection } = usePlayingActions();
  const { isTrackDownloaded } = useDownloadState();
  const isAlbumCompact = variant === 'albumCompact';
  const downloaded = isTrackDownloaded(song.id);

  const optionsRef = useSheetRef();
  const playlistRef = useSheetRef();

  const [playlistSong, setPlaylistSong] = useState<Song | null>(null);

  const heartOpacity = useSharedValue(isFavorite ? 1 : 0);
  useEffect(() => {
    heartOpacity.value = withTiming(isFavorite ? 1 : 0, { duration: 200 });
  }, [isFavorite, heartOpacity]);
  const heartStyle = useAnimatedStyle(() => ({ opacity: heartOpacity.value }));

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
              style={[styles.title, { color: colors.secondary }]}
              numberOfLines={1}
            >
              {song.title}
            </Text>

            <Text
              style={[styles.subtitle, { color: colors.subtext }]}
              numberOfLines={1}
            >
              {song.artist || t('songOptions.unknownArtist')}
              {!isAlbumCompact && ` • ${formatSongDuration(song.duration)}`}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.rowRight}>
          <Animated.View style={heartStyle}>
            <Heart size={15} color="#ff4d67" fill="#ff4d67" />
          </Animated.View>
          {downloaded && (isAlbumCompact || showDownloadedDot) && (
            <ArrowDownCircle size={16} color={colors.subtext} />
          )}
          <TouchableOpacity onPress={openOptions} hitSlop={10}>
            <Ellipsis size={18} color={colors.secondary} />
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
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});

export default memo(SongRow);
