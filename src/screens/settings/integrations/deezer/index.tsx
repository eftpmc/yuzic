import React, { useCallback, useMemo } from 'react';
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

  const toggleDiscovery = useCallback((v: boolean) => { dispatch(setDeezerDiscoveryEnabled(v)); }, [dispatch]);
  const toggleSearch = useCallback((v: boolean) => { dispatch(setDeezerSearchEnabled(v)); }, [dispatch]);
  const toggleExternal = useCallback((v: boolean) => { dispatch(setDeezerExternalEnabled(v)); }, [dispatch]);
  const toggleTopTracks = useCallback((v: boolean) => { dispatch(setDeezerTopTracksEnabled(v)); }, [dispatch]);
  const toggleSimilarArtists = useCallback((v: boolean) => { dispatch(setDeezerSimilarArtistsEnabled(v)); }, [dispatch]);
  const toggleAlbumRecs = useCallback((v: boolean) => { dispatch(setDeezerAlbumRecommendationsEnabled(v)); }, [dispatch]);
  const toggleSamples = useCallback((v: boolean) => { dispatch(setDeezerSamplesEnabled(v)); }, [dispatch]);
  const togglePlaylistRecs = useCallback((v: boolean) => { dispatch(setDeezerPlaylistRecommendationsEnabled(v)); }, [dispatch]);

  const generalItems = useMemo(() => [
    { label: t('settings.deezer.discovery'), subtext: t('settings.deezer.discoveryDescription'), value: discoveryEnabled, onValueChange: toggleDiscovery },
    { label: t('settings.deezer.search'), subtext: t('settings.deezer.searchDescription'), value: searchEnabled, onValueChange: toggleSearch },
    { label: t('settings.deezer.external'), subtext: t('settings.deezer.externalDescription'), value: externalEnabled, onValueChange: toggleExternal },
  ], [t, discoveryEnabled, searchEnabled, externalEnabled, toggleDiscovery, toggleSearch, toggleExternal]);

  const artistItems = useMemo(() => [
    { label: t('settings.deezer.topTracks'), subtext: t('settings.deezer.topTracksDescription'), value: topTracksEnabled, onValueChange: toggleTopTracks },
    { label: t('settings.deezer.similarArtists'), subtext: t('settings.deezer.similarArtistsDescription'), value: similarArtistsEnabled, onValueChange: toggleSimilarArtists },
  ], [t, topTracksEnabled, similarArtistsEnabled, toggleTopTracks, toggleSimilarArtists]);

  const albumItems = useMemo(() => [
    { label: t('settings.deezer.albumRecommendations'), subtext: t('settings.deezer.albumRecommendationsDescription'), value: albumRecommendationsEnabled, onValueChange: toggleAlbumRecs },
    { label: t('settings.deezer.samples'), subtext: t('settings.deezer.samplesDescription'), value: samplesEnabled, onValueChange: toggleSamples },
  ], [t, albumRecommendationsEnabled, samplesEnabled, toggleAlbumRecs, toggleSamples]);

  const playlistItems = useMemo(() => [
    { label: t('settings.deezer.playlistRecommendations'), subtext: t('settings.deezer.playlistRecommendationsDescription'), value: playlistRecommendationsEnabled, onValueChange: togglePlaylistRecs },
  ], [t, playlistRecommendationsEnabled, togglePlaylistRecs]);

  return (
    <SettingsScreen title="Deezer">
      <SettingsToggleGroup items={generalItems} />
      <SettingsCardHeader subtle title={t('settings.deezer.artistSection')} />
      <SettingsToggleGroup items={artistItems} />
      <SettingsCardHeader subtle title={t('settings.deezer.albumSection')} />
      <SettingsToggleGroup items={albumItems} />
      <SettingsCardHeader subtle title={t('settings.deezer.playlistSection')} />
      <SettingsToggleGroup items={playlistItems} />
    </SettingsScreen>
  );
}
