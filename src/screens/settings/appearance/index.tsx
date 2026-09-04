import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import SettingsScreen from '../components/SettingsScreen';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
import { ThemeColor } from './components/ThemeColor';
import { ThemeModeSelector } from './components/ThemeModeSelector';
import { PlayingBarActionSelector } from './components/PlayingBarActionSelector';
import { LanguageSelector } from './components/LanguageSelector';
import { GridColumns } from './components/GridColumns';
import { RadiusPresetSelector } from './components/RadiusPresetSelector';
import {
  selectShowQualityBadge,
  selectShowSourceHeaders,
  selectHapticsEnabled,
  selectRespectReducedMotion,
  selectHomeServerSectionsEnabled,
  selectHomeListenbrainzSectionsEnabled,
  selectDeezerDiscoveryEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setShowQualityBadge,
  setShowSourceHeaders,
  setHapticsEnabled,
  setRespectReducedMotion,
  setHomeServerSectionsEnabled,
  setHomeListenbrainzSectionsEnabled,
  setDeezerDiscoveryEnabled,
} from '@/utils/redux/slices/settingsSlice';

const AppearanceSettings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const showQualityBadge = useSelector(selectShowQualityBadge);
  const showSourceHeaders = useSelector(selectShowSourceHeaders);
  const hapticsEnabled = useSelector(selectHapticsEnabled);
  const respectReducedMotion = useSelector(selectRespectReducedMotion);
  const homeServerEnabled = useSelector(selectHomeServerSectionsEnabled);
  const homeListenbrainzEnabled = useSelector(selectHomeListenbrainzSectionsEnabled);
  const deezerEnabled = useSelector(selectDeezerDiscoveryEnabled);

  const toggleQualityBadge = useCallback((v: boolean) => { dispatch(setShowQualityBadge(v)); }, [dispatch]);
  const toggleSourceHeaders = useCallback((v: boolean) => { dispatch(setShowSourceHeaders(v)); }, [dispatch]);
  const toggleHaptics = useCallback((v: boolean) => { dispatch(setHapticsEnabled(v)); }, [dispatch]);
  const toggleReducedMotion = useCallback((v: boolean) => { dispatch(setRespectReducedMotion(v)); }, [dispatch]);
  const toggleHomeServer = useCallback((v: boolean) => { dispatch(setHomeServerSectionsEnabled(v)); }, [dispatch]);
  const toggleHomeListenbrainz = useCallback((v: boolean) => { dispatch(setHomeListenbrainzSectionsEnabled(v)); }, [dispatch]);
  const toggleHomeDeezer = useCallback((v: boolean) => { dispatch(setDeezerDiscoveryEnabled(v)); }, [dispatch]);

  const feelItems = useMemo(() => [
    {
      label: t('settings.appearance.haptics'),
      subtext: t('settings.appearance.hapticsSubtext'),
      value: hapticsEnabled,
      onValueChange: toggleHaptics,
    },
    {
      label: t('settings.appearance.respectReducedMotion'),
      subtext: t('settings.appearance.respectReducedMotionSubtext'),
      value: respectReducedMotion,
      onValueChange: toggleReducedMotion,
    },
  ], [t, hapticsEnabled, respectReducedMotion, toggleHaptics, toggleReducedMotion]);

  const qualityBadgeItems = useMemo(() => [{
    label: t('settings.appearance.showQualityBadge'),
    subtext: t('settings.appearance.showQualityBadgeSubtext'),
    value: showQualityBadge,
    onValueChange: toggleQualityBadge,
  }], [t, showQualityBadge, toggleQualityBadge]);

  const sourceHeaderItems = useMemo(() => [{
    label: t('settings.appearance.showSourceHeaders'),
    subtext: t('settings.appearance.showSourceHeadersSubtext'),
    value: showSourceHeaders,
    onValueChange: toggleSourceHeaders,
  }], [t, showSourceHeaders, toggleSourceHeaders]);

  const homeSourceItems = useMemo(() => [
    {
      label: t('settings.appearance.homeSourcesServer', 'On your server'),
      subtext: t('settings.appearance.homeSourcesServerSubtext', 'Show random shelves and now-playing from your server.'),
      value: homeServerEnabled,
      onValueChange: toggleHomeServer,
    },
    {
      label: t('settings.appearance.homeSourcesListenbrainz', 'ListenBrainz'),
      subtext: t('settings.appearance.homeSourcesListenbrainzSubtext', 'Show ListenBrainz similar-artist shelves.'),
      value: homeListenbrainzEnabled,
      onValueChange: toggleHomeListenbrainz,
    },
    {
      label: t('settings.appearance.homeSourcesDeezer', 'Deezer'),
      subtext: t('settings.appearance.homeSourcesDeezerSubtext', 'Show Deezer discovery shelves (charts, top tracks, similar artists).'),
      value: deezerEnabled,
      onValueChange: toggleHomeDeezer,
    },
  ], [t, homeServerEnabled, homeListenbrainzEnabled, deezerEnabled, toggleHomeServer, toggleHomeListenbrainz, toggleHomeDeezer]);

  return (
    <SettingsScreen title={t('settings.appearance.title')}>
      <LanguageSelector />
      <ThemeModeSelector />
      <ThemeColor />
      <SettingsCardHeader subtle title={t('settings.appearance.playing')} />
      <SettingsToggleGroup items={qualityBadgeItems} />
      <PlayingBarActionSelector />
      <SettingsCardHeader subtle title={t('settings.appearance.display')} />
      <SettingsToggleGroup items={sourceHeaderItems} />
      <GridColumns />
      <RadiusPresetSelector />
      <SettingsCardHeader subtle title={t('settings.appearance.homeSources', 'Home shelves')} />
      <SettingsToggleGroup items={homeSourceItems} />
      <SettingsCardHeader subtle title={t('settings.appearance.feel')} />
      <SettingsToggleGroup items={feelItems} />
    </SettingsScreen>
  );
};

export default AppearanceSettings;
