import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsSourceList from '../components/SettingsSourceList';
import {
  selectLyricsExternalSourceEnabled,
  selectLyricsExternalSourcesOrder,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setLyricsExternalSourceEnabled,
  setLyricsExternalSourcesOrder,
} from '@/utils/redux/slices/settingsSlice';

/**
 * Lyrics resolves the server first, then any opted-in external sources in the
 * order the user sets here. The same source-list primitive also powers the
 * independently ordered metadata chains.
 */
const LyricsSettings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const lrclibEnabled = useSelector(selectLyricsExternalSourceEnabled('lrclib'));
  const sourceOrder = useSelector(selectLyricsExternalSourcesOrder);

  const toggleLrclib = useCallback(
    (enabled: boolean) => dispatch(setLyricsExternalSourceEnabled({ sourceId: 'lrclib', enabled })),
    [dispatch]
  );
  const setOrder = useCallback(
    (sourceIds: string[]) => dispatch(setLyricsExternalSourcesOrder(sourceIds)),
    [dispatch]
  );

  const sources = useMemo(() => [{
    id: 'lrclib',
    label: t('settings.lyrics.lrclib'),
    subtext: t('settings.lyrics.lrclibSubtext'),
    enabled: lrclibEnabled,
    onEnabledChange: toggleLrclib,
  }], [lrclibEnabled, t, toggleLrclib]);

  return (
    <SettingsScreen title={t('settings.lyrics.title')}>
      <SettingsCardHeader subtle title={t('settings.lyrics.sources')} />
      <SettingsCard>
        <SettingsSourceList
          pinnedSource={{
            label: t('settings.lyrics.serverEmbedded'),
            subtext: t('settings.lyrics.serverEmbeddedSubtext'),
          }}
          sources={sources}
          sourceOrder={sourceOrder}
          onOrderChange={setOrder}
        />
      </SettingsCard>
    </SettingsScreen>
  );
};

export default LyricsSettings;
