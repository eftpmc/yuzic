import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { X } from 'lucide-react-native';
import { useTheme } from '@/hooks/useTheme';

type Props = {
  /** Aggregate progress in [0, 1] */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
};

/**
 * Determinate circular progress ring with a centered cancel glyph, used in
 * place of an indeterminate spinner where tapping the control cancels the
 * download (the enclosing pressable owns the tap).
 */
export default function DownloadProgressRing({
  progress,
  size = 18,
  strokeWidth = 2,
  color,
}: Props) {
  const { colors } = useTheme();
  const ringColor = color ?? colors.secondary;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(progress, 1));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeOpacity={0.25}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={circumference * (1 - clamped)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <X size={size * 0.55} color={ringColor} strokeWidth={2.5} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
