import React, { useCallback, useEffect, memo, useState } from 'react';
import { BackHandler, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Music, Play, Pause } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ImageColors from 'react-native-image-colors';
import { createAccentCache, darken, pickAccent } from '@/features/theme/coverAccent';
import { PLAYING_GRADIENT_CACHE_MAX } from '@/constants/features';

import PlaylistList from '@/components/PlaylistList';
import OutputDeviceSheet from '@/screens/playing/components/OutputDeviceSheet';
import { MediaImage } from '@/components/MediaImage';
import { usePlayingState, usePlayingActions, usePlayingProgress } from '@/contexts/PlayingContext';
import { hasFiniteDuration } from '@/utils/playback/contentKind';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import PlayingScreen from '@/screens/playing';
import PlayingBackground from '@/screens/playing/components/PlayingBackground';
import { useTheme } from '@/hooks/useTheme';
import { buildCover } from '@/utils/builders/buildCover';
import {
  selectPlayingBarAction,
  selectThemeColor,
} from '@/utils/redux/selectors/settingsSelectors';

import { usePlayingBarAction } from './actions/usePlayingBarAction';
import { useSheetRef } from '@/utils/useSheetRef';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { onDark, radius, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

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
      padding: spacing.sm,
      paddingBottom: 0,
      paddingHorizontal: spacing.page,
    },
    topRowWrapper: {
      height: 40,
      justifyContent: 'center' as const,
    },
    topRow: {
      minHeight: 40,
      paddingRight: spacing.xs,
    },
    coverArt: {
      width: 42,
      height: 42,
      marginRight: spacing.controlGap,
    },
    title: {
      ...typography.caption,
    },
    artist: {
      ...typography.caption,
    },
    progressBarContainer: {
      // Edge to edge: this is the rule between the now-playing row and the
      // tabs, so it cancels the container's page padding rather than sitting
      // inset like a widget's own progress bar.
      height: 2,
      marginTop: spacing.sm,
      marginHorizontal: -spacing.page,
      borderRadius: 0,
    },
    playPauseButton: {
      padding: spacing.sm,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: spacing.xs,
    },
    fabButton: {
      width: 38,
      height: 38,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 4,
    },
    placeholderIconSize: 32,
  },
  android: {
    wrapper: {},
    container: {
      flexDirection: 'column' as const,
      padding: spacing.sm,
      paddingBottom: 0,
      paddingHorizontal: spacing.page,
    },
    topRowWrapper: {
      height: 40,
      justifyContent: 'center' as const,
    },
    topRow: {
      minHeight: 40,
      paddingRight: spacing.xs,
    },
    coverArt: {
      width: 42,
      height: 42,
      marginRight: spacing.controlGap,
    },
    title: {
      ...typography.caption,
    },
    artist: {
      ...typography.caption,
    },
    progressBarContainer: {
      // Edge to edge: this is the rule between the now-playing row and the
      // tabs, so it cancels the container's page padding rather than sitting
      // inset like a widget's own progress bar.
      height: 2,
      marginTop: spacing.sm,
      marginHorizontal: -spacing.page,
      borderRadius: 0,
    },
    playPauseButton: {
      padding: spacing.sm,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: spacing.xs,
    },
    fabButton: {
      width: 38,
      height: 38,
      elevation: 4,
    },
    placeholderIconSize: 32,
  },
};

const gradientCache = createAccentCache<[string, string]>(PLAYING_GRADIENT_CACHE_MAX);

export default function PlayingBarBase({ variant }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const themeColor = useSelector(selectThemeColor);
  const actionMode = useSelector(selectPlayingBarAction);

  const { currentSong, isPlaying, isBuffering } = usePlayingState();
  const { pauseSong, resumeSong } = usePlayingActions();

  const stylesForVariant = variantStyles[variant];
  const bottomSheetRef = useSheetRef();
  const playlistSheetRef = useSheetRef();
  const castSheetRef = useSheetRef();
  const [isPlayerSheetOpen, setIsPlayerSheetOpen] = useState(false);
  // Gate the full-screen player tree behind first open. The tree used to be
  // mounted the entire time a song was playing so opening it was cheap on the
  // second try — the cost was renderin' the album cover, lyrics fetch, useAlbum
  // query, and every optional card (sleep timer, playback speed, volume, about
  // the artist) constantly in the background whether the user ever opened the
  // player or not. Mount on first present() instead: opens are still cheap
  // after the first (the tree stays mounted for the session), and nothing pays
  // the cost of a player screen no one has looked at.
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  const primaryAction = usePlayingBarAction(actionMode, {
    presentAddToPlaylist: () => {
      if (currentSong) playlistSheetRef.current?.present();
    },
    presentCast: () => castSheetRef.current?.present(),
  });

  // Android's hardware back button isn't intercepted by the bottom sheet on its
  // own (it renders in a Portal, not a native Modal) — without this it falls
  // through to whatever screen is underneath instead of minimizing the player.
  useEffect(() => {
    if (!isPlayerSheetOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      bottomSheetRef.current?.close();
      return true;
    });
    return () => subscription.remove();
  }, [isPlayerSheetOpen, bottomSheetRef]);

  const [currentGradient, setCurrentGradient] = useState<[string, string]>(['#000', '#000']);
  const [nextGradient, setNextGradient] = useState<[string, string]>(['#000', '#000']);

  const extractColors = useCallback(async (uri: string) => {
    const cached = gradientCache.get(uri);
    if (cached) {
      setNextGradient(cached);
      return;
    }
    try {
      const result = await ImageColors.getColors(uri, { fallback: '#121212' });
      const gradient: [string, string] = [darken(pickAccent(result, '#121212')), '#000'];
      gradientCache.set(uri, gradient);
      setNextGradient(gradient);
    } catch {
      setNextGradient(['#121212', '#000']);
    }
  }, []);

  useEffect(() => {
    if (!currentSong?.cover) return;
    const uri =
      buildCover(currentSong.cover, 'detail') ??
      buildCover({ kind: 'none' }, 'detail');
    if (uri) extractColors(uri);
  }, [currentSong?.cover, currentSong?.id, extractColors]);

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
    setHasBeenOpened(true);
    bottomSheetRef.current?.present();
  };

  const handleFadeComplete = useCallback(() => {
    setCurrentGradient(nextGradient);
  }, [nextGradient]);

  const content = (
    <View style={[styles.topRow, stylesForVariant.topRow]}>
      {currentSong?.cover ? (
        <MediaImage
          cover={currentSong.cover}
          size="thumb"
          style={[styles.coverArt, stylesForVariant.coverArt]}
        />
      ) : (
        <View style={[styles.coverArt, stylesForVariant.coverArt, styles.iconPlaceholder]}>
          <Music
            size={stylesForVariant.placeholderIconSize}
            color={colors.secondary}
          />
        </View>
      )}

      <View style={styles.details}>
        <Text
          numberOfLines={1}
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
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          accessibilityRole="button"
          testID="playing-bar-play-pause"
          style={[styles.playPauseButton, stylesForVariant.playPauseButton]}
          onPress={handlePlayPause}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isBuffering
            ? <SpinningLoaderCircle size={18} color={colors.secondary} />
            : isPlaying
              ? <Pause size={20} color={colors.secondary} fill={colors.secondary} />
              : <Play size={20} color={colors.secondary} fill={colors.secondary} />
          }
        </Touchable>
      )}

      {primaryAction && (
        <Touchable
          style={[styles.fabButton, stylesForVariant.fabButton, { backgroundColor: themeColor, borderRadius: rad.pill }]}
          onPress={primaryAction.onPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
      <Touchable
        accessibilityLabel={currentSong ? 'Now playing bar' : 'No song playing'}
        accessibilityRole="button"
        testID={currentSong ? 'playing-bar' : 'playing-bar-empty'}
        onPress={handleExpand}
      >
        <View style={[styles.wrapper, stylesForVariant.wrapper]}>
          <View style={[styles.container, stylesForVariant.container]}>{barContent}</View>
        </View>
      </Touchable>

      <BottomSheetModal
        ref={bottomSheetRef}
        // The library defaults accessible=true on the sheet container, which
        // collapses everything inside into a single opaque a11y element on
        // iOS — VoiceOver can't reach the player controls and E2E tests
        // can't see their testIDs.
        accessible={false}
        snapPoints={['100%']}
        enableDynamicSizing={false}
        enablePanDownToClose
        onChange={(index) => setIsPlayerSheetOpen(index >= 0)}
        backgroundStyle={{ backgroundColor: 'transparent' }}
        backgroundComponent={props => (
          <PlayingBackground
            {...props}
            current={currentGradient}
            next={nextGradient}
            onFadeComplete={handleFadeComplete}
          />
        )}
      >
        {hasBeenOpened
          ? <PlayingScreen onClose={() => bottomSheetRef.current?.close()} />
          : null}
      </BottomSheetModal>

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
  coverArt: {
    borderRadius: radius.sm,
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
  fabButton: {
    marginLeft: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
