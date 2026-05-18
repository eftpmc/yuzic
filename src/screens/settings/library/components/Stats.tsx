import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { RefreshCw } from 'lucide-react-native';
import { useDispatch, useSelector } from 'react-redux';
import { selectSyncOnAppStart } from '@/utils/redux/selectors/settingsSelectors';
import { setSyncOnAppStart } from '@/utils/redux/slices/settingsSlice';
import { useTheme } from '@/hooks/useTheme';
import { useSync } from '@/hooks/useSync';
import SettingsCard from '../../components/SettingsCard';
import SettingsDivider from '../../components/SettingsDivider';
import SettingsInfoRow from '../../components/SettingsInfoRow';
import SettingsToggleGroup from '../../components/SettingsToggleGroup';

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
      Animated.timing(spinValue, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [isSyncing, spinValue]);

  const spin = spinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <>
      <SettingsCard>
        <SettingsInfoRow
          label={t('settings.library.stats.lastSynced')}
          value={formatLastSynced(lastSyncedAt, t, now)}
          stacked
          right={
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <RefreshCw
                size={18}
                color={isSyncing ? colors.themeColor : colors.secondary}
                onPress={() => !isSyncing && sync(true)}
              />
            </Animated.View>
          }
        />
      </SettingsCard>
      <SettingsToggleGroup
        items={[{
          label: t('settings.library.stats.syncOnAppStart'),
          subtext: t('settings.library.stats.syncOnAppStartSubtext', { defaultValue: 'Automatically sync your library each time you open the app' }),
          value: syncOnAppStart,
          onValueChange: v => { dispatch(setSyncOnAppStart(v)); },
        }]}
      />
    </>
  );
};

export default Stats;
