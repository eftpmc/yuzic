import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, StyleSheet, Text, TextStyle, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

type Props = {
  children: string;
  style?: StyleProp<TextStyle>;
  speed?: number;
  delay?: number;
};

export default function MarqueeText({ children, style, speed = 40, delay = 2000 }: Props) {
  const [containerWidth, setContainerWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const translateX = useSharedValue(0);
  const measured = useRef(false);

  const overflow = textWidth > containerWidth && containerWidth > 0;
  const distance = textWidth - containerWidth;

  useEffect(() => {
    if (!overflow) {
      cancelAnimation(translateX);
      translateX.value = 0;
      return;
    }

    const duration = (distance / speed) * 1000;

    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-distance, { duration, easing: Easing.linear }),
          withDelay(delay, withTiming(0, { duration: 0 }))
        ),
        -1,
        false
      )
    );

    return () => cancelAnimation(translateX);
  }, [overflow, distance, speed, delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View
      style={styles.container}
      onLayout={e => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View style={[overflow && animatedStyle]}>
        <Text
          style={[style, overflow && styles.noWrap]}
          numberOfLines={overflow ? undefined : 1}
          onLayout={e => {
            if (!measured.current) {
              measured.current = true;
              setTextWidth(e.nativeEvent.layout.width);
            }
          }}
        >
          {children}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  noWrap: {
    flexShrink: 0,
  },
});
