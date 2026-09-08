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
import { ListDensitySelector } from './components/ListDensitySelector';
import {
  selectShowQualityBadge,
  selectShowSourceHeaders,
  selectHapticsEnabled,
  selectTranslucentDock,
  selectRespectReducedMotion,
  selectCoverAccentEnabled,
  selectHomeServerSectionsEnabled,
  selectListenbrainzDiscoveryEnabled,
  selectDeezerDiscoveryEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setShowQualityBadge,
  setShowSourceHeaders,
  setHapticsEnabled,
  setTranslucentDock,
  setRespectReducedMotion,
  setCoverAccentEnabled,
  setHomeServerSectionsEnabled,
  setListenbrainzDiscoveryEnabled,
  setDeezerDiscoveryEnabled,
} from '@/utils/redux/slices/settingsSlice';

const AppearanceSettings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const showQualityBadge = useSelector(selectShowQualityBadge);
  const showSourceHeaders = useSelector(selectShowSourceHeaders);
  const hapticsEnabled = useSelector(selectHapticsEnabled);
  const translucentDock = useSelector(selectTranslucentDock);
  const respectReducedMotion = useSelector(selectRespectReducedMotion);
  const coverAccentEnabled = useSelector(selectCoverAccentEnabled);
  const homeServerEnabled = useSelector(selectHomeServerSectionsEnabled);
  const homeListenbrainzEnabled = useSelector(selectListenbrainzDiscoveryEnabled);
  const deezerEnabled = useSelector(selectDeezerDiscoveryEnabled);

  const toggleQualityBadge = useCallback((v: boolean) => { dispatch(setShowQualityBadge(v)); }, [dispatch]);
  const toggleSourceHeaders = useCallback((v: boolean) => { dispatch(setShowSourceHeaders(v)); }, [dispatch]);
  const toggleHaptics = useCallback((v: boolean) => { dispatch(setHapticsEnabled(v)); }, [dispatch]);
  const toggleReducedMotion = useCallback((v: boolean) => { dispatch(setRespectReducedMotion(v)); }, [dispatch]);
  const toggleCoverAccent = useCallback((v: boolean) => { dispatch(setCoverAccentEnabled(v)); }, [dispatch]);
  const toggleHomeServer = useCallback((v: boolean) => { dispatch(setHomeServerSectionsEnabled(v)); }, [dispatch]);
  // Same lever the Integrations screen shows, on purpose: a shelf that
  // appears here is a call to ListenBrainz, so there is one switch for both
  // rather than a display toggle that can sit on while the source is off —
  // which is how the Deezer row beside it already behaves.
  const toggleHomeListenbrainz = useCallback((v: boolean) => { dispatch(setListenbrainzDiscoveryEnabled(v)); }, [dispatch]);
  const toggleHomeDeezer = useCallback((v: boolean) => { dispatch(setDeezerDiscoveryEnabled(v)); }, [dispatch]);
  const toggleTranslucentDock = useCallback((v: boolean) => { dispatch(setTranslucentDock(v)); }, [dispatch]);

  const feelItems = useMemo(() => [
    {
      label: t('settings.appearance.translucentDock'),
      subtext: t('settings.appearance.translucentDockSubtext'),
      value: translucentDock,
      onValueChange: toggleTranslucentDock,
    },
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
  ], [t, translucentDock, hapticsEnabled, respectReducedMotion, toggleTranslucentDock, toggleHaptics, toggleReducedMotion]);

  const qualityBadgeItems = useMemo(() => [{
    label: t('settings.appearance.showQualityBadge'),
    subtext: t('settings.appearance.showQualityBadgeSubtext'),
    value: showQualityBadge,
    onValueChange: toggleQualityBadge,
  }], [t, showQualityBadge, toggleQualityBadge]);

  const coverAccentItems = useMemo(() => [{
    label: t('settings.appearance.coverAccent'),
    subtext: t('settings.appearance.coverAccentSubtext'),
    value: coverAccentEnabled,
    onValueChange: toggleCoverAccent,
  }], [t, coverAccentEnabled, toggleCoverAccent]);

  const sourceHeaderItems = useMemo(() => [{
    label: t('settings.appearance.showSourceHeaders'),
    subtext: t('settings.appearance.showSourceHeadersSubtext'),
    value: showSourceHeaders,
    onValueChange: toggleSourceHeaders,
  }], [t, showSourceHeaders, toggleSourceHeaders]);

  const homeSourceItems = useMemo(() => [
    {
      label: t('settings.appearance.homeSourcesServer'),
      subtext: t('settings.appearance.homeSourcesServerSubtext'),
      value: homeServerEnabled,
      onValueChange: toggleHomeServer,
    },
    {
      label: t('settings.appearance.homeSourcesListenbrainz'),
      subtext: t('settings.appearance.homeSourcesListenbrainzSubtext'),
      value: homeListenbrainzEnabled,
      onValueChange: toggleHomeListenbrainz,
    },
    {
      label: t('settings.appearance.homeSourcesDeezer'),
      subtext: t('settings.appearance.homeSourcesDeezerSubtext'),
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
      <SettingsToggleGroup items={coverAccentItems} />
      <GridColumns />
      <RadiusPresetSelector />
      <ListDensitySelector />
      <SettingsCardHeader subtle title={t('settings.appearance.homeSources')} />
      <SettingsToggleGroup items={homeSourceItems} />
      <SettingsCardHeader subtle title={t('settings.appearance.feel')} />
      <SettingsToggleGroup items={feelItems} />
    </SettingsScreen>
  );
};

export default AppearanceSettings;
