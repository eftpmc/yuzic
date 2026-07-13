import React, { memo, useCallback, useEffect, useState } from 'react';
import { spacing, statusColor } from '@/constants/design';
import {
  View,
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
import MediaListRow from '@/components/MediaListRow';
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
      <MediaListRow
        title={song.title}
        subtitle={`${song.artist || t('songOptions.unknownArtist')}${!isAlbumCompact ? ` • ${formatSongDuration(song.duration)}` : ''}`}
        cover={song.cover}
        onPress={handlePress}
        disabled={!onPress && !collection}
        showCover={!isAlbumCompact}
        variant="compact"
        rowStyle={isAlbumCompact ? styles.mediaRowAlbumCompact : undefined}
        trailing={
          <View style={styles.rowRight}>
            <Animated.View style={heartStyle}>
              <Heart size={15} color={statusColor.favorite} fill={statusColor.favorite} />
            </Animated.View>
            {downloaded && (isAlbumCompact || showDownloadedDot) && (
              <ArrowDownCircle size={16} color={colors.subtext} />
            )}
            <TouchableOpacity onPress={openOptions} hitSlop={10}>
              <Ellipsis size={18} color={colors.secondary} />
            </TouchableOpacity>
          </View>
        }
      />

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
  mediaRowAlbumCompact: {
    paddingVertical: 13,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.inlineGap,
  },
});

export default memo(SongRow);
