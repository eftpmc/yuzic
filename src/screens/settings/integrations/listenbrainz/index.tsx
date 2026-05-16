import React, { useEffect, useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { CheckCircle, XCircle } from 'lucide-react-native';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { toast } from '@backpackapp-io/react-native-toast';

import SettingsScreen from '../../components/SettingsScreen';
import SettingsCard from '../../components/SettingsCard';
import SettingsDivider from '../../components/SettingsDivider';
import SettingsToggleRow from '../../components/SettingsToggleRow';
import { useTheme } from '@/hooks/useTheme';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
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
  const themeColor = useSelector(selectThemeColor);
  const { isDarkMode, colors } = useTheme();
  const activeServer = useSelector(selectActiveServer);
  const serverId = activeServer?.id ?? '';

  const username = useSelector(selectListenBrainzUsername);
  const token = useSelector(selectListenBrainzToken);
  const isAuthenticated = useSelector(selectListenBrainzAuthenticated);
  const config = useSelector(selectListenBrainzConfig);
  const scrobbleEnabled = useSelector(selectListenBrainzScrobbleEnabled);
  const nowPlayingEnabled = useSelector(selectListenBrainzNowPlayingEnabled);

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
            if (!result.success) {
              toast.error(result.message || t('settings.listenBrainz.connectFailed'));
            }
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

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
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
      if (result.success) {
        dispatch(setAuthenticated({ serverId, value: true }));
        toast.success(t('settings.listenBrainz.connectionSuccessful'));
      } else {
        dispatch(setAuthenticated({ serverId, value: false }));
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
      <SettingsCard style={styles.inputCard}>
        <Text style={[styles.label, { color: colors.text }]}>
          {t('settings.listenBrainz.username')}
        </Text>
        <TextInput
          value={username}
          onChangeText={v => dispatch(setUsername({ serverId, value: v.trim() }))}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('settings.listenBrainz.usernamePlaceholder')}
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.text }]}
        />

        <Text style={[styles.label, { color: colors.text }]}>
          {t('settings.listenBrainz.userToken')}
        </Text>
        <TextInput
          value={token}
          onChangeText={v => dispatch(setToken({ serverId, value: v.trim() }))}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('settings.listenBrainz.tokenPlaceholder')}
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.text }]}
        />

        <TouchableOpacity style={styles.connectivityRow} onPress={handlePing}>
          <Text style={[styles.rowText, { color: colors.text }]}>
            {t('settings.listenBrainz.connectivity')}
          </Text>
          {isLoading ? (
            <SpinningLoaderCircle size={20} color={themeColor} />
          ) : isAuthenticated ? (
            <CheckCircle size={20} color={themeColor} />
          ) : (
            <XCircle size={20} color="red" />
          )}
        </TouchableOpacity>
      </SettingsCard>

      {isAuthenticated && (
        <>
          <SettingsCard>
            <SettingsToggleRow
              label={t('settings.scrobbling.scrobble')}
              subtext={t('settings.scrobbling.scrobbleDescription')}
              value={scrobbleEnabled}
              onValueChange={v => { dispatch(setScrobbleEnabled({ serverId, value: v })); }}
            />
            <SettingsDivider />
            <SettingsToggleRow
              label={t('settings.scrobbling.nowPlaying')}
              subtext={t('settings.scrobbling.nowPlayingDescription')}
              value={nowPlayingEnabled}
              onValueChange={v => { dispatch(setNowPlayingEnabled({ serverId, value: v })); }}
            />
          </SettingsCard>

          <TouchableOpacity style={styles.disconnectButton} onPress={handleDisconnect}>
            <MaterialIcons name="logout" size={20} color="#fff" />
            <Text style={styles.disconnectButtonText}>{t('settings.listenBrainz.disconnect')}</Text>
          </TouchableOpacity>
        </>
      )}
    </SettingsScreen>
  );
};

export default ListenBrainzView;

const styles = StyleSheet.create({
  inputCard: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  connectivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 16,
  },
  rowText: { fontSize: 16 },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  disconnectButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
