import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';

import * as slskd from '@/api/slskd';
import type { SlskdQueueRecord, SlskdSearchPreferences } from '@/api/slskd';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsSelectCard from '../components/SettingsSelectCard';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { selectSlskdPreferences } from '@/utils/redux/selectors/downloadersSelectors';
import { setSlskdPreferences } from '@/utils/redux/slices/downloadersSlice';
import DownloaderSettingsScreen from './DownloaderSettingsScreen';
import { useSlskdRenderItem } from './useSlskdRenderItem';

const MIN_BITRATE_OPTIONS: number[] = [0, 128, 192, 256, 320];

const SearchPreferencesCard: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const preferences = useSelector(selectSlskdPreferences);
  const serverId = activeServer?.id ?? '';

  const update = useCallback(
    (patch: Partial<SlskdSearchPreferences>) => {
      if (!serverId) return;
      dispatch(setSlskdPreferences({ serverId, preferences: patch }));
    },
    [dispatch, serverId]
  );

  const formatItems = useMemo(
    () => [
      { key: 'auto', label: t('settings.downloaders.slskd.formatAuto') },
      { key: 'flac', label: t('settings.downloaders.slskd.formatFlacOnly') },
    ],
    [t]
  );

  const bitrateItems = useMemo(
    () =>
      MIN_BITRATE_OPTIONS.map((kbps) => ({
        key: String(kbps),
        label:
          kbps === 0
            ? t('settings.downloaders.slskd.minBitrateAny')
            : t('settings.downloaders.slskd.minBitrateValue', { kbps }),
      })),
    [t]
  );

  const preferSlotItems = useMemo(
    () => [
      {
        label: t('settings.downloaders.slskd.preferFreeSlot'),
        subtext: t('settings.downloaders.slskd.preferFreeSlotSubtext'),
        value: preferences.preferFreeSlot,
        onValueChange: (v: boolean) => update({ preferFreeSlot: v }),
      },
    ],
    [preferences.preferFreeSlot, t, update]
  );

  return (
    <>
      <SettingsCardHeader
        title={t('settings.downloaders.slskd.searchPreferencesTitle')}
        subtle
      />
      <SettingsSelectCard
        title={t('settings.downloaders.slskd.preferredFormat')}
        items={formatItems}
        isSelected={(key) => preferences.preferredFormat === key}
        onSelect={(key) =>
          update({ preferredFormat: key as SlskdSearchPreferences['preferredFormat'] })
        }
      />
      <SettingsSelectCard
        title={t('settings.downloaders.slskd.minBitrate')}
        items={bitrateItems}
        isSelected={(key) => Number(key) === preferences.minBitrateKbps}
        onSelect={(key) => update({ minBitrateKbps: Number(key) })}
      />
      <SettingsToggleGroup items={preferSlotItems} />
    </>
  );
};

const SlskdView: React.FC = () => {
  const renderItem = useSlskdRenderItem();

  return (
    <DownloaderSettingsScreen<SlskdQueueRecord>
      id="slskd"
      testConnection={slskd.testConnection}
      fetchQueueWithDiff={slskd.fetchQueueWithDiff}
      cancelQueueItem={slskd.cancelQueueItem}
      renderItem={renderItem}
      extraCards={<SearchPreferencesCard />}
    />
  );
};

export default SlskdView;
