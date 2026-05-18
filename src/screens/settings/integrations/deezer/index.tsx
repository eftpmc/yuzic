import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import SettingsScreen from '../../components/SettingsScreen';
import SettingsToggleGroup from '../../components/SettingsToggleGroup';
import {
  selectDeezerDiscoveryEnabled,
  selectDeezerSearchEnabled,
  selectDeezerExternalScreensEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setDeezerDiscoveryEnabled,
  setDeezerSearchEnabled,
  setDeezerExternalScreensEnabled,
} from '@/utils/redux/slices/settingsSlice';

export default function DeezerSettings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const discoveryEnabled = useSelector(selectDeezerDiscoveryEnabled);
  const searchEnabled = useSelector(selectDeezerSearchEnabled);
  const externalScreensEnabled = useSelector(selectDeezerExternalScreensEnabled);

  return (
    <SettingsScreen title="Deezer">
      <SettingsToggleGroup
        items={[
          {
            label: t('settings.deezer.discovery'),
            subtext: t('settings.deezer.discoveryDescription'),
            value: discoveryEnabled,
            onValueChange: v => { dispatch(setDeezerDiscoveryEnabled(v)); },
          },
          {
            label: t('settings.deezer.search'),
            subtext: t('settings.deezer.searchDescription'),
            value: searchEnabled,
            onValueChange: v => { dispatch(setDeezerSearchEnabled(v)); },
          },
          {
            label: t('settings.deezer.externalScreens'),
            subtext: t('settings.deezer.externalScreensDescription'),
            value: externalScreensEnabled,
            onValueChange: v => { dispatch(setDeezerExternalScreensEnabled(v)); },
          },
        ]}
      />
    </SettingsScreen>
  );
}
