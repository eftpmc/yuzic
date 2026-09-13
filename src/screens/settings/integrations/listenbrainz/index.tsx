import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { notify } from '@/components/toast';

import SettingsScreen from '../../components/SettingsScreen';
import SettingsAuthCard from '../../components/SettingsAuthCard';
import SettingsDisconnectButton from '../../components/SettingsDisconnectButton';
import {
  selectListenBrainzUsername,
  selectListenBrainzToken,
  selectListenBrainzAuthenticated,
  selectListenBrainzConfig,
} from '@/utils/redux/selectors/listenbrainzSelectors';
import {
  setUsername,
  setToken,
  setAuthenticated,
  disconnect,
} from '@/utils/redux/slices/listenbrainzSlice';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import * as listenbrainz from '@/api/listenbrainz';

const ListenBrainzView: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const serverId = activeServer?.id ?? '';

  const username = useSelector(selectListenBrainzUsername);
  const token = useSelector(selectListenBrainzToken);
  const isAuthenticated = useSelector(selectListenBrainzAuthenticated);
  const config = useSelector(selectListenBrainzConfig);

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
            if (!result.success) notify.error(result.message || t('settings.listenBrainz.connectFailed'));
          }
        }
      } catch {
        if (!cancelled) {
          dispatch(setAuthenticated({ serverId, value: false }));
          notify.error(t('settings.listenBrainz.connectFailed'));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 500);

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [config, dispatch, isAuthenticated, serverId, t, token, username]);

  const handlePing = async () => {
    if (!username || !token) {
      notify.error(t('settings.listenBrainz.missingCredentials'));
      return;
    }
    setIsLoading(true);
    try {
      if (!config) return;
      const result = await listenbrainz.testConnection(config);
      dispatch(setAuthenticated({ serverId, value: result.success }));
      if (result.success) {
        notify.success(t('settings.listenBrainz.connectionSuccessful'));
      } else {
        notify.error(result.message || t('settings.listenBrainz.connectionFailed'));
      }
    } catch {
      dispatch(setAuthenticated({ serverId, value: false }));
      notify.error(t('settings.listenBrainz.connectFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    dispatch(disconnect({ serverId }));
    notify.info(t('settings.listenBrainz.disconnected'));
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
        <SettingsDisconnectButton
          label={t('settings.listenBrainz.disconnect')}
          onPress={handleDisconnect}
        />
      )}
    </SettingsScreen>
  );
};

export default ListenBrainzView;
