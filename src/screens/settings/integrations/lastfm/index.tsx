import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import SettingsScreen from '../../components/SettingsScreen';
import SettingsToggleGroup from '../../components/SettingsToggleGroup';
import { selectLastfmEnabled } from '@/utils/redux/selectors/settingsSelectors';
import { setLastfmEnabled } from '@/utils/redux/slices/settingsSlice';

/**
 * Last.fm is a read-only metadata source here — similar artists, and the seed
 * expansion behind playlist recommendations — reached with the bundled public
 * api_key rather than a user account. There is nothing to connect, so this
 * one switch is what decides whether artist names go to Last.fm at all.
 */
export default function LastfmSettings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const enabled = useSelector(selectLastfmEnabled);

  const toggle = useCallback((v: boolean) => { dispatch(setLastfmEnabled(v)); }, [dispatch]);

  const items = useMemo(() => [
    {
      label: t('settings.lastfm.enable'),
      subtext: t('settings.lastfm.enableDescription'),
      value: enabled,
      onValueChange: toggle,
    },
  ], [t, enabled, toggle]);

  return (
    <SettingsScreen title="Last.fm">
      <SettingsToggleGroup items={items} />
    </SettingsScreen>
  );
}
