import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Animated,
  Easing,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { MaterialIcons } from '@expo/vector-icons';
import { Loader2 } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { selectSyncOnAppStart } from '@/utils/redux/selectors/settingsSelectors';
import { setSyncOnAppStart } from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';
import { useSync } from '@/hooks/useSync';
import SettingsCard from '../../components/SettingsCard';
import SettingsDivider from '../../components/SettingsDivider';

function formatLastSynced(ts: number | null, t: TFunction, now = Date.now()): string {
  if (ts === null) return t('settings.library.stats.neverSynced');
  const mins = Math.floor((now - ts) / 60000);
  if (mins < 1) return t('settings.library.stats.justNow');
  if (mins < 60) return t('settings.library.stats.minsAgo', { count: mins });
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t('settings.library.stats.hoursAgo', { count: hrs });
  return t('settings.library.stats.daysAgo', { count: Math.floor(hrs / 24) });
}

const Stats: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const syncOnAppStart = useSelector(selectSyncOnAppStart);
  const { sync, isSyncing, lastSyncedAt } = useSync();
  const [now, setNow] = useState(() => Date.now());

  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, [lastSyncedAt]);

  useEffect(() => {
    if (!isSyncing) {
      spinValue.stopAnimation();
      spinValue.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [isSyncing, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <SettingsCard style={styles.card}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {t('settings.library.stats.title')}
        </Text>
        <TouchableOpacity
          onPress={() => sync(true)}
          disabled={isSyncing}
          style={[styles.refreshButton, { backgroundColor: colors.themeColor, opacity: isSyncing ? 0.6 : 1 }]}
        >
          {isSyncing ? (
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <Loader2 size={16} color="#fff" />
            </Animated.View>
          ) : (
            <MaterialIcons name="refresh" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <Text style={[styles.rowText, { color: colors.text }]}>
          {t('settings.library.stats.lastSynced')}
        </Text>
        <Text style={[styles.rowValue, { color: colors.subtext }]}>
          {formatLastSynced(lastSyncedAt, t, now)}
        </Text>
      </View>

      <SettingsDivider />

      <View style={styles.row}>
        <Text style={[styles.rowText, { color: colors.text }]}>
          {t('settings.library.stats.syncOnAppStart')}
        </Text>
        <Switch
          value={syncOnAppStart}
          onValueChange={v => { dispatch(setSyncOnAppStart(v)); }}
          trackColor={{ true: colors.themeColor }}
          thumbColor="#fff"
        />
      </View>
    </SettingsCard>
  );
};

export default Stats;

const styles = StyleSheet.create({
  card: {
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  rowText: {
    fontSize: 16,
    flex: 1,
    marginRight: 12,
  },
  rowValue: { fontSize: 14 },
});
