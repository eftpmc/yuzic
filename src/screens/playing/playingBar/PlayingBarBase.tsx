import React, { useCallback, useEffect, memo, useMemo, useRef } from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Music, Play, Pause } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';

import PlaylistList from '@/components/PlaylistList';
import OutputDeviceSheet from '@/screens/playing/components/OutputDeviceSheet';
import { MediaImage } from '@/components/MediaImage';
import { usePlayingState, usePlayingActions, usePlayingProgress } from '@/contexts/PlayingContext';
import { hasFiniteDuration } from '@/utils/playback/contentKind';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
  Easing,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import {
  PLAYER_SPRING,
  coverHandedOver,
  usePlayerExpansion,
} from '@/features/player/PlayerExpansion';
import { useTheme } from '@/hooks/useTheme';
import {
  selectPlayingBarAction,
  selectThemeColor,
} from '@/utils/redux/selectors/settingsSelectors';

import { usePlayingBarAction } from './actions/usePlayingBarAction';
import { useSheetRef } from '@/utils/useSheetRef';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { cappedTypography, fontScaleCap, iconSize, onDark, radius, spacing, typography } from '@/constants/design';

type Variant = 'ios' | 'android';

type Props = {
  variant: Variant;
};

// Isolated component so 1-second progress ticks don't rerender the full bar.
const ProgressBarStrip = memo(({
  fallbackDuration,
  themeColor,
  containerStyle,
}: {
  fallbackDuration: number;
  themeColor: string;
  containerStyle: StyleProp<ViewStyle>;
}) => {
  const { position, duration } = usePlayingProgress();
  const effectiveDuration = duration > 0 ? duration : fallbackDuration;
  const displayRatio = useSharedValue(0);

  useEffect(() => {
    const ratio = effectiveDuration > 0 ? Math.max(0, Math.min(1, position / effectiveDuration)) : 0;
    displayRatio.value = withTiming(ratio, { duration: 1000, easing: Easing.linear });
  }, [position, effectiveDuration, displayRatio]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${displayRatio.value * 100}%`,
  }));

  return (
    <View style={[styles.progressBarContainer, containerStyle]}>
      <Animated.View style={[styles.progressBar, fillStyle, { backgroundColor: themeColor }]} />
    </View>
  );
});
ProgressBarStrip.displayName = 'ProgressBarStrip';

const variantStyles = {
  ios: {
    // No margins, radius or shadow: the bar is the top row of the tab dock,
    // not a card resting on it. The dock owns the surface and the hairline.
    wrapper: {},
    container: {
      flexDirection: 'column' as const,
      // Equal above the row and below it. Tighter than the gap around the
      // 40pt cover was: the art grows into this padding rather than pushing
      // the row taller, so the cover gains prominence and the bar does not
      // gain height.
      paddingTop: spacing.sm,
      paddingBottom: 0,
      paddingHorizontal: spacing.page,
    },
    topRowWrapper: {
      justifyContent: 'center' as const,
    },
    topRow: {
      // The artwork sets the row height rather than sitting inside it with
      // slack, so the cover can grow without the dock growing with it.
      minHeight: 48,
      paddingRight: 0,
    },
    coverArt: {
      width: 48,
      height: 48,
      marginRight: spacing.md,
    },
    // The title was `caption` like the artist under it, so the two read as
    // one block of small text with no hierarchy. It is the loudest thing in
    // the row now, with the artist staying quiet beneath.
    title: {
      ...cappedTypography.control.compactRowTitle,
    },
    artist: {
      ...cappedTypography.control.caption,
    },
    progressBarContainer: {
      // Edge to edge: this is the rule between the now-playing row and the
      // tabs, so it cancels the container's page padding rather than sitting
      // inset like a widget's own progress bar.
      height: 2,
      marginTop: spacing.sm,
      marginHorizontal: -spacing.page,
      borderRadius: radius.none,
    },
    playPauseButton: {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: spacing.roomy,
    },
    actionButton: {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    placeholderIconSize: 32,
  },
  android: {
    wrapper: {},
    container: {
      flexDirection: 'column' as const,
      // Equal above the row and below it. Tighter than the gap around the
      // 40pt cover was: the art grows into this padding rather than pushing
      // the row taller, so the cover gains prominence and the bar does not
      // gain height.
      paddingTop: spacing.sm,
      paddingBottom: 0,
      paddingHorizontal: spacing.page,
    },
    topRowWrapper: {
      justifyContent: 'center' as const,
    },
    topRow: {
      // The artwork sets the row height rather than sitting inside it with
      // slack, so the cover can grow without the dock growing with it.
      minHeight: 48,
      paddingRight: 0,
    },
    coverArt: {
      width: 48,
      height: 48,
      marginRight: spacing.md,
    },
    // The title was `caption` like the artist under it, so the two read as
    // one block of small text with no hierarchy. It is the loudest thing in
    // the row now, with the artist staying quiet beneath.
    title: {
      ...cappedTypography.control.compactRowTitle,
    },
    artist: {
      ...cappedTypography.control.caption,
    },
    progressBarContainer: {
      // Edge to edge: this is the rule between the now-playing row and the
      // tabs, so it cancels the container's page padding rather than sitting
      // inset like a widget's own progress bar.
      height: 2,
      marginTop: spacing.sm,
      marginHorizontal: -spacing.page,
      borderRadius: radius.none,
    },
    playPauseButton: {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: spacing.roomy,
    },
    actionButton: {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    },
    placeholderIconSize: 32,
  },
};

/**
 * How far up the bar has to be dragged to count as a full open, and how fast a
 * flick has to be to count regardless of distance. A short sharp flick is how
 * most people open a player; a slow drag past a third of the screen is the
 * other way, and anything less falls back to the dock.
 */
const OPEN_AT = 0.3;
const OPEN_VELOCITY = -700;

export default function PlayingBarBase({ variant }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const actionMode = useSelector(selectPlayingBarAction);
  const { height } = useWindowDimensions();

  const { currentSong, isPlaying, isBuffering } = usePlayingState();
  const { pauseSong, resumeSong } = usePlayingActions();
  const { expansion, barCover, fullCover, expand, prepare } = usePlayerExpansion();

  const stylesForVariant = variantStyles[variant];
  const playlistSheetRef = useSheetRef();
  const castSheetRef = useSheetRef();

  const primaryAction = usePlayingBarAction(actionMode, {
    presentAddToPlaylist: () => {
      if (currentSong) playlistSheetRef.current?.present();
    },
    presentCast: () => castSheetRef.current?.present(),
  });

  // Where the thumbnail sits on screen, so the player knows where to fly the
  // cover from. Measured rather than computed: the dock changes height with
  // the safe area and with the translucent setting, and a hardcoded rect would
  // be wrong on exactly the devices hardest to check.
  const coverRef = useRef<View>(null);
  const measureCover = useCallback(() => {
    coverRef.current?.measureInWindow((x, y, width) => {
      if (width > 0) barCover.value = { x, y, size: width };
    });
  }, [barCover]);

  const handlePlayPause = async () => {
    if (!currentSong) return;
    if (isPlaying) {
      await pauseSong();
    } else {
      await resumeSong();
    }
  };

  const handleExpand = () => {
    if (!currentSong) return;
    measureCover();
    expand();
  };

  // Dragging the bar upward moves the player itself rather than starting an
  // animation and watching it play: `expansion` follows the finger, and only
  // the release is animated. `onBegin` builds the player screen at touch-down
  // so the tree is ready before the drag has travelled far enough to show it.
  const dragToOpen = useMemo(
    () =>
      Gesture.Pan()
        .enabled(currentSong != null)
        .activeOffsetY([-10, 10])
        .failOffsetX([-24, 24])
        .onBegin(() => {
          runOnJS(prepare)();
          runOnJS(measureCover)();
        })
        .onUpdate(event => {
          expansion.value = Math.min(1, Math.max(0, -event.translationY / height));
        })
        .onEnd(event => {
          const opening = expansion.value > OPEN_AT || event.velocityY < OPEN_VELOCITY;
          expansion.value = withSpring(opening ? 1 : 0, PLAYER_SPRING);
        }),
    [currentSong, expansion, height, measureCover, prepare],
  );

  // The bar's own contents step aside early in the travel, leaving the cover
  // to make the journey on its own.
  const barFadeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expansion.value, [0, 0.25], [1, 0], Extrapolation.CLAMP),
  }));

  // The thumbnail is handed over to the player host as soon as the host can
  // actually draw it, so there is one piece of cover art in the air rather
  // than two — or, as there used to be on the first drag of a session, none.
  const coverHandoffStyle = useAnimatedStyle(() => ({
    opacity: coverHandedOver(expansion.value, barCover.value, fullCover.value) ? 0 : 1,
  }));

  const content = (
    <View style={[styles.topRow, stylesForVariant.topRow]}>
      <Animated.View
        ref={coverRef}
        onLayout={measureCover}
        style={[styles.coverArt, stylesForVariant.coverArt, coverHandoffStyle]}
      >
        {currentSong?.cover ? (
          <MediaImage
            cover={currentSong.cover}
            size="thumb"
            style={styles.coverFill}
          />
        ) : (
          <View style={[styles.coverFill, styles.iconPlaceholder]}>
            <Music
              size={stylesForVariant.placeholderIconSize}
              color={colors.secondary}
            />
          </View>
        )}
      </Animated.View>

      <View style={styles.details}>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={fontScaleCap.control}
          style={[
            styles.title,
            stylesForVariant.title,
            { color: colors.secondary },
          ]}
        >
          {currentSong?.title || t('playing.bar.noSong')}
        </Text>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={fontScaleCap.control}
          style={[
            styles.artist,
            stylesForVariant.artist,
            { color: colors.subtext },
          ]}
        >
          {currentSong?.artist || t('playing.bar.selectTrack')}
        </Text>
      </View>

      {currentSong && (
        <Touchable
          accessibilityLabel={isPlaying ? t('a11y.player.pause') : t('a11y.player.play')}
          accessibilityRole="button"
          testID="playing-bar-play-pause"
          style={[styles.playPauseButton, stylesForVariant.playPauseButton]}
          onPress={handlePlayPause}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {isBuffering
            ? <SpinningLoaderCircle size={iconSize.control} color={colors.secondary} />
            : isPlaying
              ? <Pause size={iconSize.header} color={colors.secondary} fill={colors.secondary} />
              : <Play size={iconSize.header} color={colors.secondary} fill={colors.secondary} />
          }
        </Touchable>
      )}

      {/* A filled accent disc here made the contextual action the loudest
          thing in the dock while play/pause was a bare glyph beside it. Both
          are plain now, separated by size and colour instead. */}
      {primaryAction && (
        <Touchable
          accessibilityRole="button"
          accessibilityLabel={primaryAction.label}
          accessibilityState={primaryAction.selected === undefined
            ? undefined
            : { selected: primaryAction.selected }}
          style={[styles.actionButton, stylesForVariant.actionButton]}
          onPress={primaryAction.onPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          {primaryAction.icon}
        </Touchable>
      )}
    </View>
  );

  const barContent = (
    <>
      {stylesForVariant.topRowWrapper ? (
        <View style={stylesForVariant.topRowWrapper}>{content}</View>
      ) : content}

      {/* A radio station has no meaningful position to draw — hide the strip
       * entirely rather than let it sit flat at zero. Podcast episodes keep it. */}
      {hasFiniteDuration(currentSong) && (
        <ProgressBarStrip
          fallbackDuration={Number(currentSong?.duration) || 1}
          themeColor={themeColor}
          containerStyle={[
            stylesForVariant.progressBarContainer,
            { backgroundColor: colors.border },
          ]}
        />
      )}
    </>
  );

  return (
    <>
      <GestureDetector gesture={dragToOpen}>
        <Animated.View style={barFadeStyle}>
          <Touchable
            accessibilityLabel={currentSong ? t('a11y.player.nowPlayingBar') : t('a11y.player.noSongPlaying')}
            accessibilityRole="button"
            testID={currentSong ? 'playing-bar' : 'playing-bar-empty'}
            onPressIn={prepare}
            onPress={handleExpand}
          >
            <View style={[styles.wrapper, stylesForVariant.wrapper]}>
              <View style={[styles.container, stylesForVariant.container]}>{barContent}</View>
            </View>
          </Touchable>
        </Animated.View>
      </GestureDetector>

      <PlaylistList
        ref={playlistSheetRef}
        selectedSong={currentSong}
        onClose={() => playlistSheetRef.current?.dismiss()}
      />

      <OutputDeviceSheet ref={castSheetRef} />
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
  container: {},
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  coverFill: {
    width: '100%',
    height: '100%',
  },
  coverArt: {
    borderRadius: radius.sm,
    // The artwork fills this slot now rather than being it, so the slot has to
    // do the clipping — it is what the player measures and hands over.
    overflow: 'hidden',
  },
  details: {
    flex: 1,
  },
  title: {
    fontWeight: '500',
  },
  artist: {
    marginTop: spacing.xxs,
  },
  iconPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    backgroundColor: onDark.mutedText,
    borderRadius: radius.xs,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  playPauseButton: {},
  actionButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
