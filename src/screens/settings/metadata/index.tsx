import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsSourceList from '../components/SettingsSourceList';
import {
  selectMetadataArtistInfoOrder,
  selectMetadataArtistInfoSourceEnabled,
  selectMetadataArtworkOrder,
  selectMetadataArtworkSourceEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setMetadataArtistInfoOrder,
  setMetadataArtistInfoSourceEnabled,
  setMetadataArtworkOrder,
  setMetadataArtworkSourceEnabled,
} from '@/utils/redux/slices/settingsSlice';

/**
 * Optional, display-only enrichment. Each chain resolves only when server
 * metadata is absent and has its own persisted fallback order.
 */
const MetadataSettings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const lastfmEnabled = useSelector(selectMetadataArtistInfoSourceEnabled('lastfm'));
  const deezerArtworkEnabled = useSelector(selectMetadataArtworkSourceEnabled('deezer'));
  const coverArtArchiveEnabled = useSelector(selectMetadataArtworkSourceEnabled('coverartarchive'));
  const artistInfoOrder = useSelector(selectMetadataArtistInfoOrder);
  const artworkOrder = useSelector(selectMetadataArtworkOrder);

  const toggleLastfm = useCallback(
    (enabled: boolean) => dispatch(setMetadataArtistInfoSourceEnabled({ sourceId: 'lastfm', enabled })),
    [dispatch]
  );
  const toggleDeezerArtwork = useCallback(
    (enabled: boolean) => dispatch(setMetadataArtworkSourceEnabled({ sourceId: 'deezer', enabled })),
    [dispatch]
  );
  const toggleCoverArtArchive = useCallback(
    (enabled: boolean) => dispatch(setMetadataArtworkSourceEnabled({ sourceId: 'coverartarchive', enabled })),
    [dispatch]
  );

  const artistInfoSources = useMemo(() => [{
    id: 'lastfm',
    label: t('settings.metadata.lastfm'),
    subtext: t('settings.metadata.lastfmSubtext'),
    enabled: lastfmEnabled,
    onEnabledChange: toggleLastfm,
  }], [lastfmEnabled, t, toggleLastfm]);
  const artworkSources = useMemo(() => [
    {
      id: 'deezer',
      label: t('settings.metadata.deezerArtwork'),
      subtext: t('settings.metadata.deezerArtworkSubtext'),
      enabled: deezerArtworkEnabled,
      onEnabledChange: toggleDeezerArtwork,
    },
    {
      id: 'coverartarchive',
      label: t('settings.metadata.coverArtArchive'),
      subtext: t('settings.metadata.coverArtArchiveSubtext'),
      enabled: coverArtArchiveEnabled,
      onEnabledChange: toggleCoverArtArchive,
    },
  ], [coverArtArchiveEnabled, deezerArtworkEnabled, t, toggleCoverArtArchive, toggleDeezerArtwork]);

  return (
    <SettingsScreen title={t('settings.metadata.title')}>
      <SettingsCardHeader subtle title={t('settings.metadata.explanation')} />

      <SettingsCardHeader subtle title={t('settings.metadata.artistInfoSection')} />
      <SettingsCard>
        <SettingsSourceList
          sources={artistInfoSources}
          sourceOrder={artistInfoOrder}
          onOrderChange={sourceIds => dispatch(setMetadataArtistInfoOrder(sourceIds))}
        />
      </SettingsCard>

      <SettingsCardHeader subtle title={t('settings.metadata.artworkSection')} />
      <SettingsCard>
        <SettingsSourceList
          sources={artworkSources}
          sourceOrder={artworkOrder}
          onOrderChange={sourceIds => dispatch(setMetadataArtworkOrder(sourceIds))}
        />
      </SettingsCard>
    </SettingsScreen>
  );
};

export default MetadataSettings;
