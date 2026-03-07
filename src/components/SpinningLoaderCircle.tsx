import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { LoaderCircle } from 'lucide-react-native';

type Props = {
  size: number;
  color: string;
};

export default function SpinningLoaderCircle({ size, color }: Props) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [rotation]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate: spin }] }}>
      <LoaderCircle size={size} color={color} />
    </Animated.View>
  );
}
