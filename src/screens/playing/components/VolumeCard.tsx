import React, { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { Volume2, VolumeX, Volume1 } from 'lucide-react-native';
import { useSelector } from 'react-redux';

import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { usePlayingActions, usePlayingState } from '@/contexts/PlayingContext';
import { iconSize, onDark, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';
import haptics from '@/utils/haptics';

type Props = { contentWidth: number };

/**
 * In-app volume slider — controls the player's own gain (0..1), independent
 * of the device's system volume. The player already exposes `setVolume` via
 * TrackPlayer; this card exposes it to users. Off by default so the standard
 * player looks unchanged; enable under Settings › Player.
 */
export default function VolumeCard({ contentWidth }: Props) {
  const themeColor = useSelector(selectThemeColor);
  const rad = useRadius();
  const { volume } = usePlayingState();
  const { setVolume } = usePlayingActions();

  const handleChange = useCallback((next: number) => {
    setVolume(next);
  }, [setVolume]);

  const handleSlidingComplete = useCallback(() => {
    haptics.selection();
  }, []);

  const Icon = volume <= 0.01 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;
  const percent = Math.round(volume * 100);
  const isMuted = volume <= 0.01;

  return (
    <View
      style={[
        styles.card,
        { width: contentWidth, borderRadius: rad.panel },
      ]}
    >
      <View style={styles.headerRow}>
        <Icon size={iconSize.inline} color={isMuted ? themeColor : 'rgba(255,255,255,0.5)'} />
        <Text style={[styles.label, isMuted && { color: themeColor }]}>
          Volume
        </Text>
        <View style={styles.spacer} />
        <Text style={styles.percent}>{percent}%</Text>
      </View>

      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={1}
        step={0.01}
        value={volume}
        onValueChange={handleChange}
        onSlidingComplete={handleSlidingComplete}
        minimumTrackTintColor={themeColor}
        maximumTrackTintColor="rgba(255,255,255,0.15)"
        thumbTintColor={themeColor}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.roomy,
    paddingBottom: spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  spacer: { flex: 1 },
  percent: {
    ...typography.caption,
    fontWeight: '500',
    color: onDark.subtext,
  },
  slider: {
    width: '100%',
    height: 40,
  },
});
