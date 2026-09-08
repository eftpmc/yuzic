import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import SettingsScreen from '../components/SettingsScreen';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
import {
  selectHomeServerSectionsEnabled,
  selectListenbrainzDiscoveryEnabled,
  selectDeezerDiscoveryEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setHomeServerSectionsEnabled,
  setListenbrainzDiscoveryEnabled,
  setDeezerDiscoveryEnabled,
} from '@/utils/redux/slices/settingsSlice';

/**
 * Which sources feed Home.
 *
 * These lived in Appearance, which is where nobody would look for them: they
 * decide what Home *shows*, not what it looks like. Someone turning off Deezer
 * discovery goes hunting through Integrations; someone turning off their
 * server's shelves has no obvious place to go at all.
 *
 * Home is a surface of its own in this app — `features/home/homeLayout` groups
 * its sections into tiers, and the Home-versus-Library distinction is a rule
 * the codebase already keeps — so its settings get a screen of their own too.
 *
 * The badge that labels an external section stays in Appearance. That one is
 * about whether a thing is drawn, which is the same question as the player's
 * control toggles, and it gets the same answer.
 */
const HomeSettings: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();

  const homeServerEnabled = useSelector(selectHomeServerSectionsEnabled);
  const homeListenbrainzEnabled = useSelector(selectListenbrainzDiscoveryEnabled);
  const deezerEnabled = useSelector(selectDeezerDiscoveryEnabled);

  const toggleHomeServer = useCallback(
    (v: boolean) => { dispatch(setHomeServerSectionsEnabled(v)); }, [dispatch]);
  // Same lever the Integrations screen shows, on purpose: a shelf that appears
  // here is a call to ListenBrainz, so there is one switch for both rather
  // than a display toggle that can sit on while the source is off — which is
  // how the Deezer row beside it already behaves.
  const toggleHomeListenbrainz = useCallback(
    (v: boolean) => { dispatch(setListenbrainzDiscoveryEnabled(v)); }, [dispatch]);
  const toggleHomeDeezer = useCallback(
    (v: boolean) => { dispatch(setDeezerDiscoveryEnabled(v)); }, [dispatch]);

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
  ], [
    t, homeServerEnabled, homeListenbrainzEnabled, deezerEnabled,
    toggleHomeServer, toggleHomeListenbrainz, toggleHomeDeezer,
  ]);

  return (
    <SettingsScreen title={t('settings.home.title')}>
      <SettingsCardHeader subtle title={t('settings.appearance.homeSources')} />
      <SettingsToggleGroup items={homeSourceItems} />
    </SettingsScreen>
  );
};

export default HomeSettings;
