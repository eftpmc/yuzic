import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Moon } from 'lucide-react-native';
import TrackPlayer from '@rntp/player';
import { useSelector } from 'react-redux';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { mmkv } from '@/utils/mmkvStorage';

const MMKV_KEY = 'sleep_timer_target_ms';

const MAX_SECONDS = 120 * 60;
const INCREMENTS = [5, 15, 30];

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

type Props = { contentWidth: number };

export default function SleepTimerCard({ contentWidth }: Props) {
  const themeColor = useSelector(selectThemeColor);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const targetMsRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isActive = remainingSeconds !== null;

  // Restore persisted timer on mount
  useEffect(() => {
    const saved = mmkv.getNumber(MMKV_KEY);
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
          mmkv.remove(MMKV_KEY);
        }
      }, 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCountdown = useCallback((totalSeconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    targetMsRef.current = Date.now() + totalSeconds * 1000;
    mmkv.set(MMKV_KEY, targetMsRef.current);
    setRemainingSeconds(totalSeconds);

    intervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.round((targetMsRef.current! - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        targetMsRef.current = null;
        setRemainingSeconds(null);
        mmkv.remove(MMKV_KEY);
      }
    }, 1000);
  }, []);

  const handleIncrement = useCallback((minutes: number) => {
    const current = targetMsRef.current
      ? Math.max(0, Math.round((targetMsRef.current - Date.now()) / 1000))
      : 0;
    const newSeconds = Math.min(current + minutes * 60, MAX_SECONDS);
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
    mmkv.remove(MMKV_KEY);
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
        { width: contentWidth },
        isActive && { borderColor: themeColor + '55', borderWidth: 1 },
      ]}
    >
      {/* Decorative moon */}
      <View style={styles.moonDecor} pointerEvents="none">
        <Moon
          size={88}
          color={isActive ? themeColor : '#ffffff'}
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
          Sleep Timer
        </Text>
      </View>

      {/* Countdown */}
      <Text style={[styles.bigValue, isActive && { color: '#fff' }]}>
        {remainingSeconds === null ? '—' : formatCountdown(remainingSeconds)}
      </Text>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={handleOff}
          activeOpacity={0.7}
          disabled={!isActive}
          style={[
            styles.offButton,
            isActive
              ? { borderColor: 'rgba(255,255,255,0.3)' }
              : { borderColor: 'rgba(255,255,255,0.12)' },
          ]}
        >
          <Text style={[styles.offLabel, !isActive && { opacity: 0.35 }]}>
            Off
          </Text>
        </TouchableOpacity>

        {INCREMENTS.map(min => (
          <TouchableOpacity
            key={min}
            onPress={() => handleIncrement(min)}
            activeOpacity={0.7}
            style={styles.incrButton}
          >
            <Text style={styles.incrLabel}>
              +{min}m
            </Text>
          </TouchableOpacity>
        ))}
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
  moonDecor: {
    position: 'absolute',
    top: -10,
    right: -10,
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
  controls: {
    flexDirection: 'row',
    gap: 8,
  },
  offButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  incrButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incrLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
  },
});
