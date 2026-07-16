import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from '@backpackapp-io/react-native-toast';

import SettingsScreen from '../../components/SettingsScreen';
import SettingsCardHeader from '../../components/SettingsCardHeader';
import SettingsAuthCard from '../../components/SettingsAuthCard';
import SettingsToggleGroup from '../../components/SettingsToggleGroup';
import SettingsDisconnectButton from '../../components/SettingsDisconnectButton';
import * as audiomuse from '@/api/audiomuse';

import {
  selectAudiomuseServerUrl,
  selectAudiomuseApiToken,
  selectAudiomuseEnabled,
  selectAudiomuseAuthenticated,
  selectAudiomuseConfig,
} from '@/utils/redux/selectors/audiomuseSelectors';
import {
  setAudiomuseServerUrl,
  setAudiomuseApiToken,
  setAudiomuseEnabled,
  setAudiomuseAuthenticated,
  connectAudiomuse,
  disconnectAudiomuse,
} from '@/utils/redux/slices/audiomuseSlice';

import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';

const AudiomuseView: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const activeServer = useSelector(selectActiveServer);
  const serverId = activeServer?.id ?? '';

  const serverUrl = useSelector(selectAudiomuseServerUrl);
  const apiToken = useSelector(selectAudiomuseApiToken);
  const isEnabled = useSelector(selectAudiomuseEnabled);
  const isAuthenticated = useSelector(selectAudiomuseAuthenticated);
  const config = useSelector(selectAudiomuseConfig);

  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!serverUrl || !apiToken) {
      dispatch(setAudiomuseAuthenticated({ serverId, value: false }));
      return;
    }
    if (isAuthenticated) return;

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        if (config.serverUrl && config.apiToken) {
          await audiomuse.testConnection(config);
          if (!cancelled) dispatch(connectAudiomuse({ serverId }));
        }
      } catch {
        if (!cancelled) {
          dispatch(setAudiomuseAuthenticated({ serverId, value: false }));
          toast.error(t('settings.audiomuse.connectionFailed'));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 500);

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [apiToken, config, dispatch, isAuthenticated, serverId, serverUrl, t]);

  const handlePing = useCallback(async () => {
    if (!config.serverUrl || !config.apiToken || isLoading) return;
    setIsLoading(true);
    try {
      await audiomuse.testConnection(config);
      dispatch(connectAudiomuse({ serverId }));
    } catch {
      dispatch(setAudiomuseAuthenticated({ serverId, value: false }));
      toast.error(t('settings.audiomuse.connectionFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [config, dispatch, isLoading, serverId, t]);

  const handleDisconnect = () => {
    dispatch(disconnectAudiomuse({ serverId }));
    toast(t('settings.audiomuse.disconnected'));
  };

  const enableItems = [{
    label: t('settings.audiomuse.enable'),
    subtext: t('settings.audiomuse.enableSubtext'),
    value: isEnabled,
    onValueChange: (v: boolean) => dispatch(setAudiomuseEnabled({ serverId, value: v })),
  }];

  if (!activeServer) return null;

  return (
    <SettingsScreen title={t('settings.audiomuse.title')}>
      <SettingsCardHeader subtle title={t('settings.audiomuse.credentialsHelper')} />
      <SettingsAuthCard
        fields={[
          { label: t('settings.audiomuse.serverUrl'), value: serverUrl, onChangeText: v => dispatch(setAudiomuseServerUrl({ serverId, value: v })), placeholder: t('settings.audiomuse.serverUrlPlaceholder') },
          { label: t('settings.audiomuse.apiToken'), value: apiToken, onChangeText: v => dispatch(setAudiomuseApiToken({ serverId, value: v })), placeholder: t('settings.audiomuse.apiTokenPlaceholder'), secureTextEntry: true },
        ]}
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        connectivityLabel={t('settings.audiomuse.connectivity')}
        onConnectivityPress={handlePing}
      />

      <SettingsToggleGroup items={enableItems} />

      {isAuthenticated && (
        <SettingsDisconnectButton
          label={t('settings.audiomuse.disconnect')}
          onPress={handleDisconnect}
        />
      )}
    </SettingsScreen>
  );
};

export default AudiomuseView;
