import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, PanResponder, type GestureResponderEvent } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

type SeekableProgressBarProps = {
  value: number;
  duration: number;
  onSeek: (position: number) => void;
  fillColor?: string;
  trackColor?: string;
  style?: object;
};

export const SeekableProgressBar: React.FC<SeekableProgressBarProps> = ({
  value,
  duration,
  onSeek,
  fillColor = '#fff',
  trackColor = '#888',
  style,
}) => {
  const trackRef = useRef<View>(null);
  const durationRef = useRef(duration);
  const onSeekRef = useRef(onSeek);
  const isSeeking = useRef(false);
  const pendingRatio = useRef(-1);
  const displayRatio = useSharedValue(0);

  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { onSeekRef.current = onSeek; }, [onSeek]);

  useEffect(() => {
    if (isSeeking.current) return;
    const ratio = duration > 0 ? Math.max(0, Math.min(1, value / duration)) : 0;
    if (pendingRatio.current >= 0) {
      if (Math.abs(ratio - pendingRatio.current) > 0.02) return;
      pendingRatio.current = -1;
    }
    displayRatio.value = withTiming(ratio, { duration: 1000, easing: Easing.linear });
  }, [value, duration]);

  const handleTouch = (evt: GestureResponderEvent) => {
    const { pageX } = evt.nativeEvent;
    trackRef.current?.measureInWindow((viewX, _viewY, viewWidth) => {
      if (viewWidth <= 0) return;
      const r = Math.max(0, Math.min(1, (pageX - viewX) / viewWidth));
      displayRatio.value = r;
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        isSeeking.current = true;
        handleTouch(e);
      },
      onPanResponderMove: handleTouch,
      onPanResponderRelease: (e) => {
        handleTouch(e);
        // Small delay so measureInWindow above resolves before we read displayRatio
        setTimeout(() => {
          pendingRatio.current = displayRatio.value;
          isSeeking.current = false;
          onSeekRef.current(displayRatio.value * durationRef.current);
        }, 32);
      },
      onPanResponderTerminate: () => {
        pendingRatio.current = displayRatio.value;
        isSeeking.current = false;
      },
    })
  ).current;

  const fillStyle = useAnimatedStyle(() => ({
    width: `${displayRatio.value * 100}%`,
  }));

  return (
    <View style={[styles.touchTarget, style]} {...panResponder.panHandlers}>
      <View ref={trackRef} style={[styles.track, { backgroundColor: trackColor }]}>
        <Animated.View style={[styles.fill, fillStyle, { backgroundColor: fillColor }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  touchTarget: {
    minHeight: 44,
    justifyContent: 'center',
    marginVertical: -20,
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
