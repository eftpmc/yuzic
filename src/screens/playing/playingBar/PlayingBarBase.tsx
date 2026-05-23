import React, { useCallback, useEffect, memo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { Music, Play, Pause } from 'lucide-react-native';
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import ImageColors from 'react-native-image-colors';

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
  }, [position, effectiveDuration]);

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

const GRADIENT_CACHE_MAX = 150;
const gradientCache = new Map<string, string[]>();

function darkenHexColor(hex: string, amount = 0.3) {
  let col = hex.replace('#', '');
  if (col.length === 3) col = col.split('').map(c => c + c).join('');
  const num = parseInt(col, 16);
  const r = Math.floor(((num >> 16) & 0xff) * (1 - amount));
  const g = Math.floor(((num >> 8) & 0xff) * (1 - amount));
  const b = Math.floor((num & 0xff) * (1 - amount));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b)
    .toString(16)
    .slice(1)}`;
}

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

  const primaryAction = usePlayingBarAction(actionMode, {
    presentAddToPlaylist: () => {
      if (currentSong) playlistSheetRef.current?.present();
    },
    presentCast: () => castSheetRef.current?.present(),
  });

  const [currentGradient, setCurrentGradient] = useState<string[]>(['#000', '#000']);
  const [nextGradient, setNextGradient] = useState<string[]>(['#000', '#000']);

  const extractColors = useCallback(async (uri: string) => {
    const cached = gradientCache.get(uri);
    if (cached) {
      setNextGradient(cached);
      return;
    }
    try {
      const colors = await ImageColors.getColors(uri, { fallback: '#121212' });
      let dominant = '#121212';
      if (colors.platform === 'android') {
        dominant = colors.darkVibrant || colors.dominant || dominant;
      } else {
        dominant = (colors as any).primary || dominant;
      }
      const gradient = [darkenHexColor(dominant), '#000'];
      if (gradientCache.size >= GRADIENT_CACHE_MAX) {
        gradientCache.delete(gradientCache.keys().next().value!);
      }
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
        <TouchableOpacity
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          accessibilityRole="button"
          testID="playing-bar-play-pause"
          style={[styles.playPauseButton, stylesForVariant.playPauseButton]}
          onPress={handlePlayPause}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isBuffering
            ? <ActivityIndicator size="small" color={colors.secondary} />
            : isPlaying
              ? <Pause size={20} color={colors.secondary} fill={colors.secondary} />
              : <Play size={20} color={colors.secondary} fill={colors.secondary} />
          }
        </TouchableOpacity>
      )}

      {primaryAction && (
        <TouchableOpacity
          style={[styles.fabButton, stylesForVariant.fabButton, { backgroundColor: themeColor }]}
          onPress={primaryAction.onPress}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {primaryAction.icon}
        </TouchableOpacity>
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
      <TouchableOpacity
        accessibilityLabel={currentSong ? 'Now playing bar' : 'No song playing'}
        accessibilityRole="button"
        testID={currentSong ? 'playing-bar' : 'playing-bar-empty'}
        onPress={handleExpand}
        activeOpacity={0.9}
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
      </TouchableOpacity>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={['100%']}
        enableDynamicSizing={false}
        enablePanDownToClose
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
