import React from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import SettingsScreen from '../../components/SettingsScreen';
import SettingsToggleGroup from '../../components/SettingsToggleGroup';
import SettingsCardHeader from '../../components/SettingsCardHeader';
import {
  selectDeezerDiscoveryEnabled,
  selectDeezerSearchEnabled,
  selectDeezerExternalEnabled,
  selectDeezerTopTracksEnabled,
  selectDeezerSimilarArtistsEnabled,
  selectDeezerAlbumRecommendationsEnabled,
  selectDeezerSamplesEnabled,
  selectDeezerPlaylistRecommendationsEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setDeezerDiscoveryEnabled,
  setDeezerSearchEnabled,
  setDeezerExternalEnabled,
  setDeezerTopTracksEnabled,
  setDeezerSimilarArtistsEnabled,
  setDeezerAlbumRecommendationsEnabled,
  setDeezerSamplesEnabled,
  setDeezerPlaylistRecommendationsEnabled,
} from '@/utils/redux/slices/settingsSlice';

export default function DeezerSettings() {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const discoveryEnabled = useSelector(selectDeezerDiscoveryEnabled);
  const searchEnabled = useSelector(selectDeezerSearchEnabled);
  const externalEnabled = useSelector(selectDeezerExternalEnabled);
  const topTracksEnabled = useSelector(selectDeezerTopTracksEnabled);
  const similarArtistsEnabled = useSelector(selectDeezerSimilarArtistsEnabled);
  const albumRecommendationsEnabled = useSelector(selectDeezerAlbumRecommendationsEnabled);
  const samplesEnabled = useSelector(selectDeezerSamplesEnabled);
  const playlistRecommendationsEnabled = useSelector(selectDeezerPlaylistRecommendationsEnabled);

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
            label: t('settings.deezer.external'),
            subtext: t('settings.deezer.externalDescription'),
            value: externalEnabled,
            onValueChange: v => { dispatch(setDeezerExternalEnabled(v)); },
          },
        ]}
      />

      <SettingsCardHeader subtle title={t('settings.deezer.artistSection')} />
      <SettingsToggleGroup
        items={[
          {
            label: t('settings.deezer.topTracks'),
            subtext: t('settings.deezer.topTracksDescription'),
            value: topTracksEnabled,
            onValueChange: v => { dispatch(setDeezerTopTracksEnabled(v)); },
          },
          {
            label: t('settings.deezer.similarArtists'),
            subtext: t('settings.deezer.similarArtistsDescription'),
            value: similarArtistsEnabled,
            onValueChange: v => { dispatch(setDeezerSimilarArtistsEnabled(v)); },
          },
        ]}
      />

      <SettingsCardHeader subtle title={t('settings.deezer.albumSection')} />
      <SettingsToggleGroup
        items={[
          {
            label: t('settings.deezer.albumRecommendations'),
            subtext: t('settings.deezer.albumRecommendationsDescription'),
            value: albumRecommendationsEnabled,
            onValueChange: v => { dispatch(setDeezerAlbumRecommendationsEnabled(v)); },
          },
          {
            label: t('settings.deezer.samples'),
            subtext: t('settings.deezer.samplesDescription'),
            value: samplesEnabled,
            onValueChange: v => { dispatch(setDeezerSamplesEnabled(v)); },
          },
        ]}
      />

      <SettingsCardHeader subtle title={t('settings.deezer.playlistSection')} />
      <SettingsToggleGroup
        items={[
          {
            label: t('settings.deezer.playlistRecommendations'),
            subtext: t('settings.deezer.playlistRecommendationsDescription'),
            value: playlistRecommendationsEnabled,
            onValueChange: v => { dispatch(setDeezerPlaylistRecommendationsEnabled(v)); },
          },
        ]}
      />
    </SettingsScreen>
  );
}
