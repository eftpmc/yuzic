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
import { hitSlopFor, iconSize } from '@/constants/design';

const ServerSettings: React.FC = () => {
  const { t } = useTranslation();
  const api = useApi();
  const dispatch = useDispatch();

  const searchScope = useSelector(selectSearchScope);
  const activeServer = useSelector(selectActiveServer);
  const serverScrobbleEnabled = useSelector(selectServerScrobbleEnabled);
  const queueSyncEnabled = useSelector(selectQueueSyncEnabled);
  const nowPlayingShelfEnabled = useSelector(selectServerNowPlayingShelfEnabled);

  const toggleScrobble = useCallback((v: boolean) => { dispatch(setServerScrobbleEnabled(v)); }, [dispatch]);
  const toggleQueueSync = useCallback((v: boolean) => { dispatch(setQueueSyncEnabled(v)); }, [dispatch]);
  const toggleNowPlayingShelf = useCallback((v: boolean) => { dispatch(setServerNowPlayingShelfEnabled(v)); }, [dispatch]);

  // Shared-server privacy — a switch appears only where the adapter can back
  // the thing it governs, rather than showing a Jellyfin user a toggle that
  // couldn't do anything either way. Only Subsonic backs these today; a server
  // that grows the API gets the switches with no change here.
  const supportsQueueSync = Boolean(api.queue);
  const supportsNowPlayingShelf = Boolean(api.discovery);

  const privacyItems = useMemo(() => {
    const items: { label: string; subtext: string; value: boolean; onValueChange: (v: boolean) => void }[] = [];
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

  // One switch, worded for what the server actually does with the call — the
  // adapter says which, so this doesn't ask what kind of server it is.
  //
  // Now-playing follows scrobble; there was a separate row for it and the two
  // states were never independently useful — a user who doesn't want the
  // finished listen submitted doesn't want the in-progress broadcast either.
  const scrobbleItems = useMemo(() => {
    const isScrobble = api.songs.scrobbleKind === 'scrobble';
    return [{
      label: t(isScrobble ? 'settings.scrobbling.scrobble' : 'settings.scrobbling.markAsPlayed'),
      subtext: t(isScrobble
        ? 'settings.scrobbling.scrobbleDescription'
        : 'settings.scrobbling.markAsPlayedDescription'),
      value: serverScrobbleEnabled,
      onValueChange: toggleScrobble,
    }];
  }, [t, api, serverScrobbleEnabled, toggleScrobble]);
  const [isLoading, setIsLoading] = useState(false);

  const serverUrl = activeServer?.serverUrl;
  const username = activeServer?.username;
  const isAuthenticated = activeServer?.isAuthenticated;
  const cleanUrl = serverUrl?.replace(/^https?:\/\//, '') ?? t('settings.server.notSet');

  // What the last ping actually found, as opposed to `isAuthenticated`, which
  // is a stored credential flag the ping never writes — reading that made the
  // dot go green against a server that had just refused to answer.
  const [reachable, setReachable] = useState<boolean | null>(null);

  const ping = async () => {
    if (!api || !serverUrl || isLoading) return;
    setIsLoading(true);
    try {
      await api.auth.ping();
      setReachable(true);
    } catch {
      setReachable(false);
    }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (!api || !serverUrl) return;
    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        await api.auth.ping();
        if (!cancelled) setReachable(true);
      } catch {
        if (!cancelled) setReachable(false);
      }
      finally { if (!cancelled) setIsLoading(false); }
    }, 500);
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [api, serverUrl]);

  // Until the first ping lands there is nothing better to show than whether we
  // hold credentials at all.
  const isConnected = reachable ?? !!isAuthenticated;

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
              hitSlop={hitSlopFor(iconSize.badge)}
            >
              <ConnectivityIndicator isLoading={isLoading} isConnected={isConnected} />
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

      {activeServer && (
        <>
          <SettingsCardHeader subtle title={t('settings.scrobbling.title')} />
          <SettingsToggleGroup items={scrobbleItems} />
        </>
      )}

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
