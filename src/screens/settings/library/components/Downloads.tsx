import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { selectAutoDownloadNewSongs, selectDownloadOnWifiOnly } from '@/utils/redux/selectors/settingsSelectors';
import { setAutoDownloadNewSongs, setDownloadOnWifiOnly } from '@/utils/redux/slices/settingsSlice';
import SettingsCard from '../../components/SettingsCard';
import SettingsCardHeader from '../../components/SettingsCardHeader';
import SettingsDivider from '../../components/SettingsDivider';
import SettingsToggleRow from '../../components/SettingsToggleRow';

/**
 * Download *preferences* only — the two toggles that govern how offline
 * downloading behaves. The offline library itself (storage used, saved items,
 * per-item removal) now lives on its own Library → Offline screen, and server
 * transfer activity on Library → Downloads, so this settings block no longer
 * repeats storage stats or links out to a queue.
 */
const Downloads: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const autoDownloadNewSongs = useSelector(selectAutoDownloadNewSongs);
  const downloadOnWifiOnly = useSelector(selectDownloadOnWifiOnly);

  return (
    <>
    <SettingsCardHeader subtle title={t('settings.library.downloads.title')} />
    <SettingsCard>
      <SettingsToggleRow
        label={t('settings.library.downloads.autoDownloadLabel')}
        subtext={t('settings.library.downloads.autoDownloadSubtext')}
        value={autoDownloadNewSongs}
        onValueChange={value => dispatch(setAutoDownloadNewSongs(value))}
      />
      <SettingsDivider />
      <SettingsToggleRow
        label={t('settings.library.downloads.wifiOnlyLabel')}
        subtext={t('settings.library.downloads.wifiOnlySubtext')}
        value={downloadOnWifiOnly}
        onValueChange={value => dispatch(setDownloadOnWifiOnly(value))}
      />
    </SettingsCard>
    </>
  );
};

export default Downloads;
