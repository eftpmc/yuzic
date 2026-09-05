import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  Extrapolation,
} from 'react-native-reanimated';
import ImageColors from 'react-native-image-colors';
import { useSelector } from 'react-redux';

import { createAccentCache, pickAccent, toWashAccent } from '@/features/theme/coverAccent';
import { PLAYING_GRADIENT_CACHE_MAX } from '@/constants/features';
import { usePlayingState } from '@/contexts/PlayingContext';
import { MediaImage } from '@/components/MediaImage';
import { buildCover } from '@/utils/builders/buildCover';
import { selectCoverAccentEnabled } from '@/utils/redux/selectors/settingsSelectors';
import PlayingScreen from '@/screens/playing';
import PlayingBackground from '@/screens/playing/components/PlayingBackground';
import { radius } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

import { CLOSED_EPSILON, usePlayerExpansion } from './PlayerExpansion';

const gradientCache = createAccentCache<[string, string]>(PLAYING_GRADIENT_CACHE_MAX);

/** What the player fades to with no accent to show — extraction failed, or the
 *  user turned cover tinting off. */
const NEUTRAL_GRADIENT: [string, string] = ['#121212', '#000'];

/**
 * The full-screen player, and the cover art that travels between it and the
 * playing bar.
 *
 * This sits above the navigator and below the bottom-sheet portal, so it
 * covers every screen and the dock, while the option sheets the player opens
 * still come up over it.
 *
 * The player used to be a `BottomSheetModal`, which meant the bar and the
 * screen were two unrelated surfaces: tapping the bar dropped one and raised
 * the other. They are one surface now, at a position the finger can hold.
 */
export default function PlayerHost() {
  const { expansion, barCover, fullCover, scrollY, isOpen, hasOpened, collapse } =
    usePlayerExpansion();
  const { height, width } = useWindowDimensions();
  // The travelling cover is laid out once at a fixed size and only ever
  // scaled, so its width and height stay static styles rather than becoming
  // per-frame layout work.
  const REFERENCE_SIZE = width;
  const { currentSong } = usePlayingState();
  const coverAccentEnabled = useSelector(selectCoverAccentEnabled);
  const rad = useRadius();

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
      const gradient: [string, string] = [toWashAccent(pickAccent(result, '#121212')), '#000'];
      gradientCache.set(uri, gradient);
      setNextGradient(gradient);
    } catch {
      setNextGradient(NEUTRAL_GRADIENT);
    }
  }, []);

  useEffect(() => {
    // With cover tinting off the bar and player keep the neutral dark they
    // already fall back to when extraction fails, so there is one "no accent"
    // look rather than two.
    if (!coverAccentEnabled) {
      setNextGradient(NEUTRAL_GRADIENT);
      return;
    }
    if (!currentSong?.cover) return;
    const uri =
      buildCover(currentSong.cover, 'detail') ??
      buildCover({ kind: 'none' }, 'detail');
    if (uri) extractColors(uri);
  }, [coverAccentEnabled, currentSong?.cover, currentSong?.id, extractColors]);

  const handleFadeComplete = useCallback(() => {
    setCurrentGradient(nextGradient);
  }, [nextGradient]);

  // Android's back button collapses the player rather than leaving the screen
  // underneath it, the same as it did while this was a modal sheet.
  useEffect(() => {
    if (!isOpen) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      collapse();
      return true;
    });
    return () => subscription.remove();
  }, [isOpen, collapse]);

  const surfaceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - expansion.value) * height }],
  }));

  // The screen's contents arrive after the surface has started rising, so the
  // cover is alone in the air for the first part of the travel — which is what
  // makes it read as the bar's artwork being carried up rather than as a new
  // screen that happens to have artwork on it.
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expansion.value, [0.15, 0.7], [0, 1], Extrapolation.CLAMP),
  }));

  // Resolved on the JS side and captured by the worklet below: the corner the
  // bar draws its thumbnail with, and the one the player draws its cover with.
  const barRadius = radius.sm;
  const cardRadius = rad.card;

  const coverStyle = useAnimatedStyle(() => {
    const from = barCover.value;
    const to = fullCover.value;
    const e = expansion.value;

    // Every branch returns the same style keys. Reanimated applies the shape
    // it saw first, so a short-circuit that returned only `opacity` left the
    // transform below permanently unapplied — the cover was positioned, sized
    // and simply never drawn.
    const ready = from.size > 0 && to.size > 0 && e > CLOSED_EPSILON;
    const size = interpolate(e, [0, 1], [from.size, to.size], Extrapolation.CLAMP);
    const scale = ready ? size / REFERENCE_SIZE : 1;

    // The slot is measured with the player scrolled to the top, which is where
    // it always is when the player opens. Collapsing from a scrolled position
    // — the artist link, the hardware back button — would otherwise fly the
    // cover back from where the slot used to be rather than where it is.
    const toY = to.y - scrollY.value;

    return {
      opacity: ready ? 1 : 0,
      borderRadius: interpolate(e, [0, 1], [barRadius, cardRadius], Extrapolation.CLAMP) / scale,
      transform: [
        { translateX: interpolate(e, [0, 1], [from.x, to.x], Extrapolation.CLAMP) },
        { translateY: interpolate(e, [0, 1], [from.y, toY], Extrapolation.CLAMP) },
        { scale },
      ],
    };
  });

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents={isOpen ? 'auto' : 'none'}
      // The dock underneath has to stay reachable whenever the player is not
      // covering it, and a full-screen view that only sometimes takes touches
      // is exactly the kind of thing screen readers should not announce.
      accessibilityElementsHidden={!isOpen}
      importantForAccessibility={isOpen ? 'auto' : 'no-hide-descendants'}
    >
      <Animated.View style={[StyleSheet.absoluteFill, surfaceStyle]}>
        <PlayingBackground
          style={StyleSheet.absoluteFill}
          current={currentGradient}
          next={nextGradient}
          onFadeComplete={handleFadeComplete}
        />
        <Animated.View style={[StyleSheet.absoluteFill, contentStyle]}>
          {hasOpened ? <PlayingScreen onClose={collapse} /> : null}
        </Animated.View>
      </Animated.View>

      {/* The same component every other cover in the app goes through, so it
        * resolves against the active server, falls back the same way, and
        * shows the same placeholder when there is nothing to show. Building a
        * URL here by hand meant the host missed the server subscription that
        * makes those URLs resolve at all. */}
      {currentSong?.cover && (
        <Animated.View
          style={[
            styles.travellingCover,
            { width: REFERENCE_SIZE, height: REFERENCE_SIZE },
            coverStyle,
          ]}
          pointerEvents="none"
        >
          <MediaImage cover={currentSong.cover} size="detail" style={styles.coverFill} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  coverFill: {
    width: '100%',
    height: '100%',
  },
  travellingCover: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
    // Anchored top-left so translate places the square's corner exactly where
    // it was measured, and scale grows it away from that corner.
    transformOrigin: 'top left',
  },
});
