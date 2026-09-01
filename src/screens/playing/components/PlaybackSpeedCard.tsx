import React, { useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Gauge } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { usePlayingActions, usePlayingState } from '@/contexts/PlayingContext';
import {
  PLAYBACK_DEFAULT_SPEED,
  PLAYBACK_MAX_SPEED,
  PLAYBACK_MIN_SPEED,
  PLAYBACK_SPEED_STEP,
} from '@/constants/playback';
import Touchable from '@/components/Touchable';
import { radius, typography } from '@/constants/design';

type Props = { contentWidth: number };

export default function PlaybackSpeedCard({ contentWidth }: Props) {
  const themeColor = useSelector(selectThemeColor);
  const { playbackSpeed } = usePlayingState();
  const { setPlaybackSpeed } = usePlayingActions();
  const isAltered = playbackSpeed !== 1.0;

  const decrease = useCallback(() => {
    const next = Math.round((playbackSpeed - PLAYBACK_SPEED_STEP) * 100) / 100;
    if (next >= PLAYBACK_MIN_SPEED) setPlaybackSpeed(next);
  }, [playbackSpeed, setPlaybackSpeed]);

  const increase = useCallback(() => {
    const next = Math.round((playbackSpeed + PLAYBACK_SPEED_STEP) * 100) / 100;
    if (next <= PLAYBACK_MAX_SPEED) setPlaybackSpeed(next);
  }, [playbackSpeed, setPlaybackSpeed]);

  const reset = useCallback(() => {
    setPlaybackSpeed(PLAYBACK_DEFAULT_SPEED);
  }, [setPlaybackSpeed]);

  const canDecrease = playbackSpeed > PLAYBACK_MIN_SPEED;
  const canIncrease = playbackSpeed < PLAYBACK_MAX_SPEED;

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
        <Touchable
          onPress={reset}
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
        </Touchable>

        <Touchable
          onPress={decrease}
          disabled={!canDecrease}
          style={[styles.stepButton, !canDecrease && { opacity: 0.35 }]}
        >
          <Text style={styles.stepLabel}>−</Text>
        </Touchable>

        <Touchable
          onPress={increase}
          disabled={!canIncrease}
          style={[styles.stepButton, !canIncrease && { opacity: 0.35 }]}
        >
          <Text style={styles.stepLabel}>+</Text>
        </Touchable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 16,
    borderRadius: radius.panel,
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
    ...typography.caption,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  bigValue: {
    ...typography.hero,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 20,
  },
  bigUnit: {
    ...typography.screenTitle,
    fontWeight: '400',
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  resetButton: {
    flex: 1,
    height: 44,
    borderRadius: radius.card,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetLabel: {
    ...typography.rowSubtitle,
    fontWeight: '500',
    color: '#fff',
  },
  stepButton: {
    flex: 1,
    height: 44,
    borderRadius: radius.card,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    ...typography.sectionTitle,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.45)',
  },
});
