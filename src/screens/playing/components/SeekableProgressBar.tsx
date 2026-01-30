import React, { useRef } from 'react';
import { View, StyleSheet, PanResponder, type GestureResponderEvent } from 'react-native';

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

  const positionToRatio = (position: number) =>
    duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0;

  const ratio = positionToRatio(value);

  const handleTouch = (evt: GestureResponderEvent) => {
    const { pageX } = evt.nativeEvent;
    trackRef.current?.measureInWindow((viewX, _viewY, viewWidth) => {
      if (viewWidth <= 0) return;
      const x = pageX - viewX;
      const r = Math.max(0, Math.min(1, x / viewWidth));
      onSeek(r * duration);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: handleTouch,
      onPanResponderMove: handleTouch,
      onPanResponderRelease: handleTouch,
    })
  ).current;

  return (
    <View style={[styles.touchTarget, style]} {...panResponder.panHandlers}>
      <View
        ref={trackRef}
        style={[styles.track, { backgroundColor: trackColor }]}
      >
        <View
          style={[
            styles.fill,
            {
              width: `${ratio * 100}%`,
              backgroundColor: fillColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  touchTarget: {
    minHeight: 44,
    justifyContent: 'center',
    marginVertical: -20, /* extends hit area without adding visible space */
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
