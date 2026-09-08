import React, { memo, useCallback, useEffect } from 'react';
import { fontScaleCap, hitSlopFor, iconSize, spacing, statusColor, typography } from '@/constants/design';
import { useListDensity } from '@/hooks/useListDensity';
import {
  Text,
  View,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { Heart, ArrowDownCircle, Ellipsis } from 'lucide-react-native';

import { Song } from '@/types';
import { usePlayingActions } from '@/contexts/PlayingContext';
import { useSongActionSheets } from '@/contexts/SongActionSheetContext';
import MediaListRow from '@/components/MediaListRow';
import { useTheme } from '@/hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { useDownloadState } from '@/contexts/DownloadContext';
import { formatSongDuration } from '@/utils/formatDuration';
import Touchable from '@/components/Touchable';

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
  const { openSongOptions } = useSongActionSheets();
  const { isTrackDownloaded } = useDownloadState();
  const density = useListDensity();
  const isAlbumCompact = variant === 'albumCompact';
  const downloaded = isTrackDownloaded(song.id);

  /**
   * The track's position on the record.
   *
   * Only on the album variant, which is the only place the running order is
   * the point — in a playlist or a search result the number would be the
   * song's position on some other record entirely, which is worse than no
   * number at all. Null when the server didn't tag one, rather than a
   * guessed index: a gap in the numbering is information, and a made-up "7"
   * beside a track the server calls untracked is not.
   */
  const trackNumber = isAlbumCompact && typeof song.trackNumber === 'number' && song.trackNumber > 0
    ? song.trackNumber
    : null;

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
    openSongOptions(song);
  }, [openSongOptions, song]);

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
        rowStyle={isAlbumCompact ? { paddingVertical: density.trackRowPadding } : undefined}
        leading={trackNumber !== null ? (
          <Text
            style={[styles.trackNumber, { color: colors.subtext }]}
            numberOfLines={1}
            maxFontSizeMultiplier={fontScaleCap.glyph}
          >
            {trackNumber}
          </Text>
        ) : undefined}
        trailing={
          <View style={styles.rowRight}>
            <Animated.View style={heartStyle}>
              <Heart size={iconSize.inline} color={statusColor.favorite} fill={statusColor.favorite} />
            </Animated.View>
            {downloaded && (isAlbumCompact || showDownloadedDot) && (
              <ArrowDownCircle size={iconSize.inline} color={colors.subtext} />
            )}
            <Touchable
              onPress={openOptions}
              hitSlop={hitSlopFor(18)}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.rows.options', { title: song.title })}
            >
              <Ellipsis size={iconSize.row} color={colors.secondary} />
            </Touchable>
          </View>
        }
      />
    </>
  );
};

const styles = StyleSheet.create({
  trackNumber: {
    // Smaller and quieter than the artist line beside it. At subtitle size and
    // full subtext weight the numbers read as a column of their own competing
    // with the titles, which is the opposite of what an index is for — it
    // should be findable when looked for and invisible when not.
    ...typography.caption,
    opacity: 0.6,
    // Fixed width and right-aligned so the titles form a straight edge whether
    // the record has nine tracks or nineteen. Tabular figures keep "11" the
    // same width as "17", which proportional digits do not.
    width: 20,
    marginRight: spacing.md,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.inlineGap,
  },
});

export default memo(SongRow);
