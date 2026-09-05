import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
import FallbackUrlsCard from './components/FallbackUrlsCard';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import {
  selectSearchScope,
  selectServerScrobbleEnabled,
  selectQueueSyncEnabled,
  selectServerNowPlayingShelfEnabled,
} from '@/utils/redux/selectors/settingsSelectors';
import {
  setSearchScope,
  setServerScrobbleEnabled,
  setQueueSyncEnabled,
  setServerNowPlayingShelfEnabled,
  type SearchScope,
} from '@/utils/redux/slices/settingsSlice';
import Touchable from '@/components/Touchable';

const ServerSettings: React.FC = () => {
  const { t } = useTranslation();
  const api = useApi();
  const dispatch = useDispatch();

  const searchScope = useSelector(selectSearchScope);
  const activeServer = useSelector(selectActiveServer);
  const serverScrobbleEnabled = useSelector(selectServerScrobbleEnabled);
  const queueSyncEnabled = useSelector(selectQueueSyncEnabled);
  const nowPlayingShelfEnabled = useSelector(selectServerNowPlayingShelfEnabled);
  const isNavidrome = activeServer?.type === 'navidrome';
  const isJellyfinOrEmby = activeServer?.type === 'jellyfin' || activeServer?.type === 'emby';

  const toggleScrobble = useCallback((v: boolean) => { dispatch(setServerScrobbleEnabled(v)); }, [dispatch]);
  const toggleQueueSync = useCallback((v: boolean) => { dispatch(setQueueSyncEnabled(v)); }, [dispatch]);
  const toggleNowPlayingShelf = useCallback((v: boolean) => { dispatch(setServerNowPlayingShelfEnabled(v)); }, [dispatch]);

  // Shared-server privacy — only Navidrome exposes these surfaces today, so
  // gate on that rather than showing a toggle for something a Jellyfin user
  // can't turn on either way. If the server later grows a queue/nowplaying
  // API these will appear automatically for that server too.
  const supportsQueueSync = isNavidrome;
  const supportsNowPlayingShelf = isNavidrome;

  const privacyItems = useMemo(() => {
    const items: Array<{ label: string; subtext: string; value: boolean; onValueChange: (v: boolean) => void }> = [];
    if (supportsQueueSync) items.push({
      label: t('settings.server.queueSync'),
      subtext: t('settings.server.queueSyncDescription'),
      value: queueSyncEnabled,
      onValueChange: toggleQueueSync,
    });
    if (supportsNowPlayingShelf) items.push({
      label: t('settings.server.nowPlayingShelf'),
      subtext: t('settings.server.nowPlayingShelfDescription'),
      value: nowPlayingShelfEnabled,
      onValueChange: toggleNowPlayingShelf,
    });
    return items;
  }, [supportsQueueSync, supportsNowPlayingShelf, queueSyncEnabled, nowPlayingShelfEnabled, toggleQueueSync, toggleNowPlayingShelf, t]);

  // Now-playing follows scrobble; there was a separate row for it and the two
  // states were never independently useful — a user who doesn't want the
  // finished listen submitted doesn't want the in-progress broadcast either.
  const navidromeScrobbleItems = useMemo(() => [
    { label: t('settings.scrobbling.scrobble'), subtext: t('settings.scrobbling.scrobbleDescription'), value: serverScrobbleEnabled, onValueChange: toggleScrobble },
  ], [t, serverScrobbleEnabled, toggleScrobble]);

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
            <Touchable
              accessibilityRole="button"
              accessibilityLabel={t('a11y.common.checkConnection')}
              onPress={ping}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ConnectivityIndicator isLoading={isLoading} isConnected={!!isAuthenticated} />
            </Touchable>
          }
        />
      </SettingsCard>

      <FallbackUrlsCard server={activeServer} />

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

      {privacyItems.length > 0 && (
        <>
          <SettingsCardHeader subtle title={t('settings.server.privacyTitle')} />
          <SettingsToggleGroup items={privacyItems} />
        </>
      )}
    </SettingsScreen>
  );
};

export default ServerSettings;
