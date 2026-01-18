import React, { useEffect, useRef } from "react";
import { StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import { BottomSheetBackgroundProps } from "@gorhom/bottom-sheet";

type Props = BottomSheetBackgroundProps & {
  current: string[];
  next: string[];
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
  }, [key]);

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