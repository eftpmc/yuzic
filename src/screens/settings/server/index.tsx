import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useApi } from '@/api';
import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsDivider from '../components/SettingsDivider';
import SettingsInfoRow from '../components/SettingsInfoRow';
import SettingsSelectCard from '../components/SettingsSelectCard';
import SettingsToggleGroup from '../components/SettingsToggleGroup';
import SettingsCardHeader from '../components/SettingsCardHeader';
import ConnectivityIndicator from '../components/ConnectivityIndicator';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import {
  selectSearchScope,
  selectServerScrobbleEnabled,
  selectServerNowPlayingEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setSearchScope,
  setServerScrobbleEnabled,
  setServerNowPlayingEnabled,
  type SearchScope,
} from '@/utils/redux/slices/settingsSlice';

const ServerSettings: React.FC = () => {
  const { t } = useTranslation();
  const api = useApi();
  const dispatch = useDispatch();

  const searchScope = useSelector(selectSearchScope);
  const activeServer = useSelector(selectActiveServer);
  const serverScrobbleEnabled = useSelector(selectServerScrobbleEnabled);
  const serverNowPlayingEnabled = useSelector(selectServerNowPlayingEnabled);
  const isNavidrome = activeServer?.type === 'navidrome';
  const isJellyfinOrEmby = activeServer?.type === 'jellyfin' || activeServer?.type === 'emby';

  const toggleScrobble = useCallback((v: boolean) => { dispatch(setServerScrobbleEnabled(v)); }, [dispatch]);
  const toggleNowPlaying = useCallback((v: boolean) => { dispatch(setServerNowPlayingEnabled(v)); }, [dispatch]);

  const navidromeScrobbleItems = useMemo(() => [
    { label: t('settings.scrobbling.scrobble'), subtext: t('settings.scrobbling.scrobbleDescription'), value: serverScrobbleEnabled, onValueChange: toggleScrobble },
    { label: t('settings.scrobbling.nowPlaying'), subtext: t('settings.scrobbling.nowPlayingDescription'), value: serverNowPlayingEnabled, onValueChange: toggleNowPlaying },
  ], [t, serverScrobbleEnabled, serverNowPlayingEnabled, toggleScrobble, toggleNowPlaying]);

  const jellyfinScrobbleItems = useMemo(() => [
    { label: t('settings.scrobbling.markAsPlayed'), subtext: t('settings.scrobbling.markAsPlayedDescription'), value: serverScrobbleEnabled, onValueChange: toggleScrobble },
  ], [t, serverScrobbleEnabled, toggleScrobble]);
  const [isLoading, setIsLoading] = useState(false);

  const serverUrl = activeServer?.serverUrl;
  const username = activeServer?.username;
  const isAuthenticated = activeServer?.isAuthenticated;
  const cleanUrl = serverUrl?.replace(/^https?:\/\//, '') ?? t('settings.server.notSet');

  const ping = async () => {
    if (!api || !serverUrl || isLoading) return;
    setIsLoading(true);
    try { await api.auth.ping(); } catch {}
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (!api || !serverUrl) return;
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try { await api.auth.ping(); } catch {}
      finally { if (!cancelled) setIsLoading(false); }
    }, 500);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [api, serverUrl]);

  if (!activeServer) return null;

  return (
    <SettingsScreen title={t('settings.server.title')}>
      <SettingsCard>
        <SettingsInfoRow
          label={t('settings.server.serverUrl')}
          value={cleanUrl}
          stacked
        />
        <SettingsDivider />
        <SettingsInfoRow
          label={t('settings.server.username')}
          value={username || t('settings.server.notSet')}
          stacked
        />
        <SettingsDivider />
        <SettingsInfoRow
          label={t('settings.server.connectivity')}
          right={
            <TouchableOpacity onPress={ping} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <ConnectivityIndicator isLoading={isLoading} isConnected={!!isAuthenticated} />
            </TouchableOpacity>
          }
        />
      </SettingsCard>

      <SettingsSelectCard
        title={t('settings.server.searchScopeHelp')}
        items={[
          { key: 'client', label: t('settings.server.searchScope.client') },
          { key: 'server', label: t('settings.server.searchScope.server') },
        ]}
        isSelected={key => searchScope === key}
        onSelect={key => dispatch(setSearchScope(key as SearchScope))}
      />

      {(isNavidrome || isJellyfinOrEmby) && (
        <SettingsCardHeader subtle title={t('settings.scrobbling.title')} />
      )}

      {isNavidrome && <SettingsToggleGroup items={navidromeScrobbleItems} />}
      {isJellyfinOrEmby && <SettingsToggleGroup items={jellyfinScrobbleItems} />}
    </SettingsScreen>
  );
};

export default ServerSettings;

const styles = StyleSheet.create({});
