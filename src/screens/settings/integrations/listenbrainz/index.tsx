import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from '@backpackapp-io/react-native-toast';

import SettingsScreen from '../../components/SettingsScreen';
import SettingsAuthCard from '../../components/SettingsAuthCard';
import SettingsToggleGroup from '../../components/SettingsToggleGroup';
import SettingsDisconnectButton from '../../components/SettingsDisconnectButton';
import { useTheme } from '@/hooks/useTheme';
import {
  selectListenBrainzUsername,
  selectListenBrainzToken,
  selectListenBrainzAuthenticated,
  selectListenBrainzConfig,
  selectListenBrainzScrobbleEnabled,
  selectListenBrainzNowPlayingEnabled,
} from '@/utils/redux/selectors/listenbrainzSelectors';
import {
  setUsername,
  setToken,
  setAuthenticated,
  disconnect,
  setScrobbleEnabled,
  setNowPlayingEnabled,
} from '@/utils/redux/slices/listenbrainzSlice';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import * as listenbrainz from '@/api/listenbrainz';

const ListenBrainzView: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const activeServer = useSelector(selectActiveServer);
  const serverId = activeServer?.id ?? '';

  const username = useSelector(selectListenBrainzUsername);
  const token = useSelector(selectListenBrainzToken);
  const isAuthenticated = useSelector(selectListenBrainzAuthenticated);
  const config = useSelector(selectListenBrainzConfig);
  const scrobbleEnabled = useSelector(selectListenBrainzScrobbleEnabled);
  const nowPlayingEnabled = useSelector(selectListenBrainzNowPlayingEnabled);

  const toggleScrobble = useCallback((v: boolean) => { dispatch(setScrobbleEnabled({ serverId, value: v })); }, [dispatch, serverId]);
  const toggleNowPlaying = useCallback((v: boolean) => { dispatch(setNowPlayingEnabled({ serverId, value: v })); }, [dispatch, serverId]);

  const scrobbleItems = useMemo(() => [
    { label: t('settings.scrobbling.scrobble'), subtext: t('settings.scrobbling.scrobbleDescription'), value: scrobbleEnabled, onValueChange: toggleScrobble },
    { label: t('settings.scrobbling.nowPlaying'), subtext: t('settings.scrobbling.nowPlayingDescription'), value: nowPlayingEnabled, onValueChange: toggleNowPlaying },
  ], [t, scrobbleEnabled, nowPlayingEnabled, toggleScrobble, toggleNowPlaying]);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!username || !token) {
      dispatch(setAuthenticated({ serverId, value: false }));
      return;
    }
    if (isAuthenticated) return;

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        if (config) {
          const result = await listenbrainz.testConnection(config);
          if (!cancelled) {
            dispatch(setAuthenticated({ serverId, value: result.success }));
            if (!result.success) toast.error(result.message || t('settings.listenBrainz.connectFailed'));
          }
        }
      } catch {
        if (!cancelled) {
          dispatch(setAuthenticated({ serverId, value: false }));
          toast.error(t('settings.listenBrainz.connectFailed'));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 500);

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [config, dispatch, isAuthenticated, serverId, t, token, username]);

  const handlePing = async () => {
    if (!username || !token) {
      toast.error(t('settings.listenBrainz.missingCredentials'));
      return;
    }
    setIsLoading(true);
    try {
      if (!config) return;
      const result = await listenbrainz.testConnection(config);
      dispatch(setAuthenticated({ serverId, value: result.success }));
      if (result.success) {
        toast.success(t('settings.listenBrainz.connectionSuccessful'));
      } else {
        toast.error(result.message || t('settings.listenBrainz.connectionFailed'));
      }
    } catch {
      dispatch(setAuthenticated({ serverId, value: false }));
      toast.error(t('settings.listenBrainz.connectFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    dispatch(disconnect({ serverId }));
    toast(t('settings.listenBrainz.disconnected'));
  };

  if (!activeServer) return null;

  return (
    <SettingsScreen title={t('settings.listenBrainz.title')}>
      <SettingsAuthCard
        fields={[
          { label: t('settings.listenBrainz.username'), value: username, onChangeText: v => dispatch(setUsername({ serverId, value: v.trim() })), placeholder: t('settings.listenBrainz.usernamePlaceholder') },
          { label: t('settings.listenBrainz.userToken'), value: token, onChangeText: v => dispatch(setToken({ serverId, value: v.trim() })), placeholder: t('settings.listenBrainz.tokenPlaceholder'), secureTextEntry: true },
        ]}
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        connectivityLabel={t('settings.listenBrainz.connectivity')}
        onConnectivityPress={handlePing}
      />

      {isAuthenticated && (
        <>
          <SettingsToggleGroup
            items={scrobbleItems}
          />

          <SettingsDisconnectButton
            label={t('settings.listenBrainz.disconnect')}
            onPress={handleDisconnect}
          />
        </>
      )}
    </SettingsScreen>
  );
};

export default ListenBrainzView;
