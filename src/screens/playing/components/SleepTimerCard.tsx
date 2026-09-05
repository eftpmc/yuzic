import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Moon } from 'lucide-react-native';
import TrackPlayer from '@rntp/player';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { mmkv } from '@/utils/mmkvStorage';
import {
  SLEEP_TIMER_STORAGE_KEY,
  SLEEP_TIMER_MAX_SECONDS,
  SLEEP_TIMER_INCREMENTS,
} from '@/constants/features';
import Touchable from '@/components/Touchable';
import { onDark, spacing, typography } from '@/constants/design';
import { useRadius } from '@/hooks/useRadius';

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Props = { contentWidth: number };

export default function SleepTimerCard({ contentWidth }: Props) {
  const { t } = useTranslation();
  const themeColor = useSelector(selectThemeColor);
  const rad = useRadius();
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const targetMsRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActive = remainingSeconds !== null;

  // Restore persisted timer on mount
  useEffect(() => {
    const saved = mmkv.getNumber(SLEEP_TIMER_STORAGE_KEY);
    if (saved && saved > Date.now()) {
      const remaining = Math.round((saved - Date.now()) / 1000);
      targetMsRef.current = saved;
      setRemainingSeconds(remaining);
      intervalRef.current = setInterval(() => {
        const r = Math.max(0, Math.round((targetMsRef.current! - Date.now()) / 1000));
        setRemainingSeconds(r);
        if (r === 0) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          targetMsRef.current = null;
          setRemainingSeconds(null);
          mmkv.remove(SLEEP_TIMER_STORAGE_KEY);
        }
      }, 1000);
    }
  }, []);

  const startCountdown = useCallback((totalSeconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    targetMsRef.current = Date.now() + totalSeconds * 1000;
    mmkv.set(SLEEP_TIMER_STORAGE_KEY, targetMsRef.current);
    setRemainingSeconds(totalSeconds);

    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((targetMsRef.current! - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        targetMsRef.current = null;
        setRemainingSeconds(null);
        mmkv.remove(SLEEP_TIMER_STORAGE_KEY);
      }
    }, 1000);
  }, []);

  const handleIncrement = useCallback((minutes: number) => {
    const current = targetMsRef.current
      ? Math.max(0, Math.round((targetMsRef.current - Date.now()) / 1000))
      : 0;
    const newSeconds = Math.min(current + minutes * 60, SLEEP_TIMER_MAX_SECONDS);
    const fadeOut = Math.min(30, Math.round(newSeconds * 0.15));
    TrackPlayer.sleepAfterTime(newSeconds, { fadeOutSeconds: fadeOut });
    startCountdown(newSeconds);
  }, [startCountdown]);

  const handleOff = useCallback(() => {
    TrackPlayer.cancelSleepTimer();
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    targetMsRef.current = null;
    setRemainingSeconds(null);
    mmkv.remove(SLEEP_TIMER_STORAGE_KEY);
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <View
      style={[
        styles.card,
        { width: contentWidth, borderRadius: rad.panel },
        isActive && { borderColor: themeColor + '55', borderWidth: 1 },
      ]}
    >
      {/* Decorative moon */}
      <View style={styles.moonDecor} pointerEvents="none">
        <Moon
          size={88}
          color={isActive ? themeColor : onDark.text}
          strokeWidth={1}
          style={{ opacity: 0.08 }}
        />
      </View>

      {/* Header */}
      <View style={styles.headerRow}>
        <Moon
          size={16}
          color={isActive ? themeColor : 'rgba(255,255,255,0.5)'}
          fill={isActive ? themeColor : 'transparent'}
        />
        <Text style={[styles.label, isActive && { color: themeColor }]}>
          {t('playing.sleepTimer.title')}
        </Text>
      </View>

      {/* Countdown. An em dash is not a state — it left the card's largest
          element saying nothing at all, on the one visit where the reader has
          not set a timer yet and most needs to be told so. */}
      <Text style={[styles.bigValue, isActive && { color: onDark.text }]}>
        {remainingSeconds === null
          ? t('playing.sleepTimer.off')
          : formatCountdown(remainingSeconds)}
      </Text>

      {/* Controls */}
      <View style={styles.controls}>
        <Touchable
          onPress={handleOff}
          disabled={!isActive}
          style={[
            styles.offButton,
            { borderRadius: rad.card },
            isActive
              ? { borderColor: 'rgba(255,255,255,0.3)' }
              : { borderColor: 'rgba(255,255,255,0.12)' },
          ]}
        >
          <Text style={[styles.offLabel, !isActive && { opacity: 0.35 }]}>
            {t('playing.sleepTimer.cancel')}
          </Text>
        </Touchable>

        {SLEEP_TIMER_INCREMENTS.map(min => (
          <Touchable
            key={min}
            onPress={() => handleIncrement(min)}
            style={[styles.incrButton, { borderRadius: rad.card }]}
          >
            <Text style={styles.incrLabel}>
              {t('playing.sleepTimer.addMinutes', { count: min })}
            </Text>
          </Touchable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.07)',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.roomy,
    paddingBottom: spacing.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  moonDecor: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  bigValue: {
    ...typography.hero,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: spacing.roomy,
  },
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  offButton: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offLabel: {
    ...typography.rowSubtitle,
    fontWeight: '500',
    color: onDark.text,
  },
  incrButton: {
    flex: 1,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incrLabel: {
    ...typography.rowSubtitle,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
  },
});
