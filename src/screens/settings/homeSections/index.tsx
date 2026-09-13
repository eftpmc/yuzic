import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import SettingsScreen from '../components/SettingsScreen';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
import SettingsCard from '../components/SettingsCard';
import SettingsSourceList from '../components/SettingsSourceList';
import SettingsRow from '../components/SettingsRow';
import {
  selectHomeShelfVisibilityMap, selectHomeShelfLength, selectSleepTimerPresets,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setHomeShelfVisibility, setHomeShelfOrder, setHomeShelfLength, setSleepTimerPresets,
} from '@/utils/redux/slices/settingsSlice';
import type { HomeShelfLength, HomeShelfTier } from '@/utils/redux/slices/settingsSlice';

const TIERS: { tier: HomeShelfTier; ids: string[] }[] = [
  { tier: 'resume', ids: ['quickPicks', 'continuePlaying', 'recentlyPlayed'] },
  { tier: 'library', ids: ['recentlyAdded', 'mostPlayed'] },
  { tier: 'server', ids: ['serverRandom', 'serverNowPlaying', 'localMix'] },
  { tier: 'listenbrainz', ids: ['lbSimilarArtistsForYou', 'lbCreatedForDailyJams', 'lbCreatedForWeeklyJams', 'lbCreatedForWeeklyExploration'] },
  { tier: 'deezer', ids: ['topArtists', 'charts'] },
];
const SLEEP_OPTIONS = [5, 10, 15, 20, 30, 45, 60];
const LENGTHS: HomeShelfLength[] = ['compact', 'standard', 'generous'];

const HomeSettings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const visibility = useSelector(selectHomeShelfVisibilityMap);
  const presets = useSelector(selectSleepTimerPresets);
  const length = useSelector(selectHomeShelfLength);
  const visibilityItems = useMemo(() => TIERS.flatMap(({ ids }) => ids.map(id => ({
    label: t(`settings.home.shelves.${id}`),
    subtext: t('settings.home.shelfSubtext'),
    value: visibility[id] ?? true,
    onValueChange: (value: boolean) => dispatch(setHomeShelfVisibility({ key: id, visible: value })),
  }))), [dispatch, t, visibility]);
  const setLength = useCallback((next: HomeShelfLength) => dispatch(setHomeShelfLength(next)), [dispatch]);

  return (
    <SettingsScreen title={t('settings.home.title')}>
      <SettingsCardHeader subtle title={t('settings.home.shelfLength')} />
      <SettingsCard>
        {LENGTHS.map(option => (
          <SettingsRow key={option} label={t(`settings.home.length.${option}`)} rightText={length === option ? t('settings.home.selected') : undefined} selected={length === option} onPress={() => setLength(option)} />
        ))}
      </SettingsCard>
      <SettingsCardHeader subtle title={t('settings.home.shelvesTitle')} />
      <SettingsToggleGroup items={visibilityItems} />
      {TIERS.map(({ tier, ids }) => (
        <SettingsCardHeader key={tier} subtle title={t(`settings.home.tier.${tier}`)} />
      ))}
      <SettingsCardHeader subtle title={t('settings.home.orderTitle')} />
      {TIERS.map(({ tier, ids }) => (
        <SettingsCard key={tier}>
          <SettingsSourceList
            sources={ids.map(id => ({ id, label: t(`settings.home.shelves.${id}`), subtext: t('settings.home.shelfSubtext'), enabled: true, onEnabledChange: () => undefined }))}
            sourceOrder={ids}
            onOrderChange={order => dispatch(setHomeShelfOrder({ tier, order }))}
          />
        </SettingsCard>
      ))}
      <SettingsCardHeader subtle title={t('settings.home.sleepPresets')} />
      <SettingsToggleGroup items={SLEEP_OPTIONS.map(minutes => ({
        label: t('settings.home.minutes', { count: minutes }),
        subtext: t('settings.home.sleepPresetsSubtext'),
        value: presets.includes(minutes),
        onValueChange: enabled => {
          const next = enabled ? [...new Set([...presets, minutes])].sort((a, b) => a - b) : presets.filter(value => value !== minutes);
          if (next.length > 0) dispatch(setSleepTimerPresets(next));
        },
      }))} />
    </SettingsScreen>
  );
};

export default HomeSettings;
