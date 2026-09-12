import React, { useCallback, useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/constants/design';
import { selectSearchSourceEnabled } from '@/utils/redux/selectors/settingsSelectors';
import { setSearchSourceEnabled } from '@/utils/redux/slices/settingsSlice';

/**
 * Which sources Search's "Other sources" scope may query — entirely
 * separate from Home's discovery toggles and from the per-integration
 * Settings pages (Deezer/MusicBrainz there govern Home shelves and the
 * external-browse catalog, not this). A source lighting up Home says
 * nothing about whether Search may call it.
 *
 * Deezer here reads (and writes) the unified `searchSourcesEnabled` map,
 * which falls back to the older `deezerSearchEnabled` flag only when this
 * map has no entry of its own — see `selectSearchSourceEnabled`. Toggling it
 * from this screen writes the new map going forward; nothing here needs to
 * touch the old flag.
 */
export default function SearchSettings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors } = useTheme();

  const deezerEnabled = useSelector(selectSearchSourceEnabled('deezer'));
  const musicbrainzEnabled = useSelector(selectSearchSourceEnabled('musicbrainz'));

  const toggleDeezer = useCallback(
    (enabled: boolean) => { dispatch(setSearchSourceEnabled({ sourceId: 'deezer', enabled })); },
    [dispatch]
  );
  const toggleMusicbrainz = useCallback(
    (enabled: boolean) => { dispatch(setSearchSourceEnabled({ sourceId: 'musicbrainz', enabled })); },
    [dispatch]
  );

  const items = useMemo(() => [
    { label: t('settings.search.deezer'), subtext: t('settings.search.deezerSubtext'), value: deezerEnabled, onValueChange: toggleDeezer },
    { label: t('settings.search.musicbrainz'), subtext: t('settings.search.musicbrainzSubtext'), value: musicbrainzEnabled, onValueChange: toggleMusicbrainz },
  ], [t, deezerEnabled, musicbrainzEnabled, toggleDeezer, toggleMusicbrainz]);

  return (
    <SettingsScreen title={t('settings.search.title')}>
      <Text style={[styles.explanation, { color: colors.subtext }]}>
        {t('settings.search.explanation')}
      </Text>
      <SettingsCard>
        <SettingsToggleGroup items={items} />
      </SettingsCard>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  explanation: {
    ...typography.caption,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
});
