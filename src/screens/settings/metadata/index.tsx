import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
import {
  selectMetadataArtistInfoSourceEnabled,
  selectMetadataArtworkSourceEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setMetadataArtistInfoSourceEnabled,
  setMetadataArtworkSourceEnabled,
} from '@/utils/redux/slices/settingsSlice';

/**
 * Metadata enrichment settings (`metadata.enrich`, see D3): two entirely
 * independent fallback chains — artist information and artwork — each with
 * its own ordered set of enabled sources.
 *
 * Both ship off. Enrichment here is DISPLAY-ONLY and GAPS-ONLY: it never
 * writes anything back to a server, and a source only ever gets a chance to
 * fill in a bio/tag/image when the server itself has none. Turning a source
 * off (or the last source in a chain off) simply removes it from the try
 * order, which means the resolver has nothing to try and the UI falls back
 * to exactly the server's own view — the same restoration LyricsSettings
 * relies on for its own fallback chain.
 *
 * A single source per chain at launch needs no drag handle to reorder; the
 * moment a second source ships in either chain, this screen grows an actual
 * reorder control rather than the order silently mattering with no way to
 * see or change it (matching the precedent set by LyricsSettings).
 */
const MetadataSettings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const lastfmEnabled = useSelector(selectMetadataArtistInfoSourceEnabled('lastfm'));
  const deezerArtworkEnabled = useSelector(selectMetadataArtworkSourceEnabled('deezer'));
  const coverArtArchiveEnabled = useSelector(selectMetadataArtworkSourceEnabled('coverartarchive'));

  const toggleLastfm = useCallback(
    (enabled: boolean) => {
      dispatch(setMetadataArtistInfoSourceEnabled({ sourceId: 'lastfm', enabled }));
    },
    [dispatch]
  );
  const toggleDeezerArtwork = useCallback(
    (enabled: boolean) => {
      dispatch(setMetadataArtworkSourceEnabled({ sourceId: 'deezer', enabled }));
    },
    [dispatch]
  );
  const toggleCoverArtArchive = useCallback(
    (enabled: boolean) => {
      dispatch(setMetadataArtworkSourceEnabled({ sourceId: 'coverartarchive', enabled }));
    },
    [dispatch]
  );

  const artistInfoItems = useMemo(
    () => [
      {
        label: t('settings.metadata.lastfm'),
        subtext: t('settings.metadata.lastfmSubtext'),
        value: lastfmEnabled,
        onValueChange: toggleLastfm,
      },
    ],
    [t, lastfmEnabled, toggleLastfm]
  );

  const artworkItems = useMemo(
    () => [
      {
        label: t('settings.metadata.deezerArtwork'),
        subtext: t('settings.metadata.deezerArtworkSubtext'),
        value: deezerArtworkEnabled,
        onValueChange: toggleDeezerArtwork,
      },
      {
        label: t('settings.metadata.coverArtArchive'),
        subtext: t('settings.metadata.coverArtArchiveSubtext'),
        value: coverArtArchiveEnabled,
        onValueChange: toggleCoverArtArchive,
      },
    ],
    [t, deezerArtworkEnabled, toggleDeezerArtwork, coverArtArchiveEnabled, toggleCoverArtArchive]
  );

  return (
    <SettingsScreen title={t('settings.metadata.title')}>
      <SettingsCardHeader subtle title={t('settings.metadata.explanation')} />

      <SettingsCardHeader subtle title={t('settings.metadata.artistInfoSection')} />
      <SettingsCard>
        <SettingsToggleGroup items={artistInfoItems} />
      </SettingsCard>

      <SettingsCardHeader subtle title={t('settings.metadata.artworkSection')} />
      <SettingsCard>
        <SettingsToggleGroup items={artworkItems} />
      </SettingsCard>
    </SettingsScreen>
  );
};

export default MetadataSettings;
