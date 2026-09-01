import React, { useCallback, useEffect, memo, useState } from 'react';
import { BackHandler, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Music, Play, Pause } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ImageColors from 'react-native-image-colors';
import { createAccentCache, darken, pickAccent } from '@/features/theme/coverAccent';
import { PLAYING_GRADIENT_CACHE_MAX } from '@/constants/features';

import PlaylistList from '@/components/PlaylistList';
import OutputDeviceSheet from '@/screens/playing/components/OutputDeviceSheet';
import { MediaImage } from '@/components/MediaImage';
import { usePlayingState, usePlayingActions, usePlayingProgress } from '@/contexts/PlayingContext';
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
  containerStyle: ViewStyle;
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
    blurIntensity: 100,
    wrapper: {
      marginHorizontal: 12,
      marginTop: 12,
      marginBottom: 0,
      borderRadius: 14,
      overflow: 'hidden' as const,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 10,
    },
    container: {
      flexDirection: 'column' as const,
      padding: 8,
      paddingBottom: 0,
      paddingHorizontal: 12,
      borderRadius: 14,
    },
    topRowWrapper: {
      height: 40,
      justifyContent: 'center' as const,
    },
    topRow: {
      minHeight: 40,
      paddingRight: 4,
    },
    coverArt: {
      width: 42,
      height: 42,
      marginRight: 10,
    },
    title: {
      fontSize: 13,
    },
    artist: {
      fontSize: 13,
    },
    progressBarContainer: {
      height: 3,
      marginTop: 6,
    },
    playPauseButton: {
      padding: 8,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: 4,
    },
    fabButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 3,
      elevation: 4,
    },
    placeholderIconSize: 32,
  },
  android: {
    blurIntensity: 0,
    wrapper: {
      marginHorizontal: 12,
      marginTop: 12,
      marginBottom: 0,
      borderRadius: 14,
      overflow: 'hidden' as const,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 10,
      elevation: 4,
    },
    container: {
      flexDirection: 'column' as const,
      padding: 8,
      paddingBottom: 0,
      paddingHorizontal: 12,
      borderRadius: 14,
    },
    topRowWrapper: {
      height: 40,
      justifyContent: 'center' as const,
    },
    topRow: {
      minHeight: 40,
      paddingRight: 4,
    },
    coverArt: {
      width: 42,
      height: 42,
      marginRight: 10,
    },
    title: {
      fontSize: 13,
    },
    artist: {
      fontSize: 13,
    },
    progressBarContainer: {
      height: 3,
      marginTop: 6,
    },
    playPauseButton: {
      padding: 8,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      marginRight: 4,
    },
    fabButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      elevation: 4,
    },
    placeholderIconSize: 32,
  },
};

const gradientCache = createAccentCache<[string, string]>(PLAYING_GRADIENT_CACHE_MAX);

export default function PlayingBarBase({ variant }: Props) {
  const { t } = useTranslation();
  const { isDarkMode, colors } = useTheme();
  const themeColor = useSelector(selectThemeColor);
  const actionMode = useSelector(selectPlayingBarAction);

  const { currentSong, isPlaying, isBuffering } = usePlayingState();
  const { pauseSong, resumeSong } = usePlayingActions();

  const stylesForVariant = variantStyles[variant];
  const bottomSheetRef = useSheetRef();
  const playlistSheetRef = useSheetRef();
  const castSheetRef = useSheetRef();
  const [isPlayerSheetOpen, setIsPlayerSheetOpen] = useState(false);

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
    if (currentSong) bottomSheetRef.current?.present();
  };

  const handleFadeComplete = useCallback(() => {
    setCurrentGradient(nextGradient);
  }, [nextGradient]);

  const androidSurfaceStyle = {
    backgroundColor: isDarkMode ? 'rgba(24,24,24,0.96)' : 'rgba(255,255,255,0.96)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
  };

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
          style={[styles.fabButton, stylesForVariant.fabButton, { backgroundColor: themeColor }]}
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

      <ProgressBarStrip
        fallbackDuration={Number(currentSong?.duration) || 1}
        themeColor={themeColor}
        containerStyle={stylesForVariant.progressBarContainer}
      />
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
          {variant === 'android' ? (
            <View style={[styles.container, stylesForVariant.container, androidSurfaceStyle]}>
              {barContent}
            </View>
          ) : (
            <BlurView
              intensity={stylesForVariant.blurIntensity}
              tint={isDarkMode ? 'dark' : 'light'}
              style={[styles.container, stylesForVariant.container]}
            >
              {barContent}
            </BlurView>
          )}
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
        <PlayingScreen onClose={() => bottomSheetRef.current?.close()} />
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
    borderRadius: 5,
  },
  details: {
    flex: 1,
  },
  title: {
    fontWeight: '500',
  },
  artist: {
    marginTop: 2,
  },
  iconPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarContainer: {
    backgroundColor: '#666',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  playPauseButton: {},
  fabButton: {
    marginLeft: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
