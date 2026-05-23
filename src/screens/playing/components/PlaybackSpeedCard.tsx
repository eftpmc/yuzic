import React, { useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Gauge } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { usePlayingActions, usePlayingState } from '@/contexts/PlayingContext';

const MIN_SPEED = 0.5;
const MAX_SPEED = 2.0;
const STEP = 0.25;

function formatSpeed(v: number) {
  return v === 1 ? '1×' : `${v}×`;
}

type Props = { contentWidth: number };

export default function PlaybackSpeedCard({ contentWidth }: Props) {
  const themeColor = useSelector(selectThemeColor);
  const { playbackSpeed } = usePlayingState();
  const { setPlaybackSpeed } = usePlayingActions();
  const isAltered = playbackSpeed !== 1.0;

  const decrease = useCallback(() => {
    const next = Math.round((playbackSpeed - STEP) * 100) / 100;
    if (next >= MIN_SPEED) setPlaybackSpeed(next);
  }, [playbackSpeed, setPlaybackSpeed]);

  const increase = useCallback(() => {
    const next = Math.round((playbackSpeed + STEP) * 100) / 100;
    if (next <= MAX_SPEED) setPlaybackSpeed(next);
  }, [playbackSpeed, setPlaybackSpeed]);

  const reset = useCallback(() => {
    setPlaybackSpeed(1.0);
  }, [setPlaybackSpeed]);

  const canDecrease = playbackSpeed > MIN_SPEED;
  const canIncrease = playbackSpeed < MAX_SPEED;

  return (
    <View
      style={[
        styles.card,
        { width: contentWidth },
        isAltered && { borderColor: themeColor + '55', borderWidth: 1 },
      ]}
    >
      {/* Decorative gauge */}
      <View style={styles.gaugeDecor} pointerEvents="none">
        <Gauge
          size={96}
          color={isAltered ? themeColor : '#ffffff'}
          strokeWidth={0.8}
          style={{ opacity: 0.07 }}
        />
      </View>

      {/* Header */}
      <View style={styles.headerRow}>
        <Gauge
          size={16}
          color={isAltered ? themeColor : 'rgba(255,255,255,0.5)'}
        />
        <Text style={[styles.label, isAltered && { color: themeColor }]}>
          Playback Speed
        </Text>
      </View>

      {/* Speed display */}
      <Text style={[styles.bigValue, isAltered && { color: '#fff' }]}>
        {playbackSpeed === 1 ? '1' : playbackSpeed}
        <Text style={styles.bigUnit}>×</Text>
      </Text>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={reset}
          activeOpacity={0.7}
          disabled={!isAltered}
          style={[
            styles.resetButton,
            isAltered
              ? { borderColor: 'rgba(255,255,255,0.3)' }
              : { borderColor: 'rgba(255,255,255,0.12)' },
          ]}
        >
          <Text style={[styles.resetLabel, !isAltered && { opacity: 0.35 }]}>
            1×
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={decrease}
          activeOpacity={0.7}
          disabled={!canDecrease}
          style={[styles.stepButton, !canDecrease && { opacity: 0.35 }]}
        >
          <Text style={styles.stepLabel}>−</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={increase}
          activeOpacity={0.7}
          disabled={!canIncrease}
          style={[styles.stepButton, !canIncrease && { opacity: 0.35 }]}
        >
          <Text style={styles.stepLabel}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  gaugeDecor: {
    position: 'absolute',
    bottom: -16,
    right: -16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  bigValue: {
    fontSize: 48,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.3)',
    lineHeight: 52,
    marginBottom: 20,
  },
  bigUnit: {
    fontSize: 24,
    fontWeight: '400',
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  resetButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  stepButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 20,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.45)',
  },
});
