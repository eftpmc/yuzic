import React, { useEffect, useRef } from "react";
import { StyleProp, StyleSheet, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
// Not a bottom-sheet background any more: the player owns its own surface, so
// this takes a plain style rather than the props a sheet used to hand it.
type Props = {
  style?: StyleProp<ViewStyle>;
  current: [string, string];
  next: [string, string];
  onFadeComplete: () => void;
};

const PlayingBackground: React.FC<Props> = ({
  style,
  current,
  next,
  onFadeComplete,
}) => {
  const opacity = useSharedValue(1);
  const didMount = useRef(false);
  const lastKey = useRef<string | null>(null);

  const key = next.join(",");

  useEffect(() => {
    if (!didMount.current) {
      didMount.current = true;
      lastKey.current = key;
      opacity.value = 1;
      return;
    }

    if (lastKey.current === key) return;

    lastKey.current = key;

    opacity.value = 0;
    opacity.value = withTiming(
      1,
      { duration: 1200, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) {
          runOnJS(onFadeComplete)();
        }
      }
    );
  }, [key, onFadeComplete, opacity]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[style, styles.container]}
    >
      <LinearGradient
        colors={current}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        style={[StyleSheet.absoluteFill, fadeStyle]}
      >
        <LinearGradient
          colors={next}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "transparent",
  },
});

export default PlayingBackground;
