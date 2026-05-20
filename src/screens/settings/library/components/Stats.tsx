import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { RefreshCw } from 'lucide-react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing, cancelAnimation } from 'react-native-reanimated';
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
  const rotation = useSharedValue(0);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, [lastSyncedAt]);

  useEffect(() => {
    if (isSyncing) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }
  }, [isSyncing, rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <>
      <SettingsCard>
        <SettingsInfoRow
          label={t('settings.library.stats.lastSynced')}
          value={formatLastSynced(lastSyncedAt, t, now)}
          stacked
          right={
            <Animated.View style={spinStyle}>
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
