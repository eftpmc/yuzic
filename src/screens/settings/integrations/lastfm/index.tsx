import React, { useState } from 'react';
import {
  Text,
  TextInput,
  TouchableOpacity,
  Linking,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';

import SettingsScreen from '../../components/SettingsScreen';
import SettingsCard from '../../components/SettingsCard';
import SettingsDivider from '../../components/SettingsDivider';
import SettingsToggleRow from '../../components/SettingsToggleRow';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { useTheme } from '@/hooks/useTheme';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import {
  selectLastFmApiKey,
  selectLastFmApiSecret,
  selectLastFmAuthenticated,
  selectLastFmUsername,
  selectLastFmScrobbleEnabled,
  selectLastFmNowPlayingEnabled,
} from '@/utils/redux/selectors/lastfmSelectors';
import {
  setApiKey,
  setApiSecret,
  setSessionData,
  disconnect,
  setScrobbleEnabled,
  setNowPlayingEnabled,
} from '@/utils/redux/slices/lastfmSlice';
import * as lastfm from '@/api/lastfm';

const LastFmView: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const { isDarkMode, colors } = useTheme();

  const activeServer = useSelector(selectActiveServer);
  const serverId = activeServer?.id ?? '';
  const apiKey = useSelector(selectLastFmApiKey);
  const apiSecret = useSelector(selectLastFmApiSecret);
  const isAuthenticated = useSelector(selectLastFmAuthenticated);
  const username = useSelector(selectLastFmUsername);
  const scrobbleEnabled = useSelector(selectLastFmScrobbleEnabled);
  const nowPlayingEnabled = useSelector(selectLastFmNowPlayingEnabled);

  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    if (!apiKey || !apiSecret) {
      toast.error(t('settings.lastfm.missingCredentials'));
      return;
    }
    setIsLoading(true);
    try {
      const token = await lastfm.getToken(apiKey);
      setPendingToken(token);
      await Linking.openURL(lastfm.buildAuthUrl(apiKey, token));
    } catch {
      toast.error(t('settings.lastfm.connectFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishAuth = async () => {
    if (!pendingToken || !apiKey || !apiSecret) return;
    setIsLoading(true);
    try {
      const { sessionKey, username: name } = await lastfm.getSession(apiKey, apiSecret, pendingToken);
      dispatch(setSessionData({ serverId, sessionKey, username: name }));
      setPendingToken(null);
      toast.success(t('settings.lastfm.connectionSuccessful', { username: name }));
    } catch {
      toast.error(t('settings.lastfm.sessionFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    dispatch(disconnect({ serverId }));
    setPendingToken(null);
    toast(t('settings.lastfm.disconnected'));
  };

  if (!activeServer) return null;

  return (
    <SettingsScreen title={t('settings.lastfm.title')}>
      <SettingsCard style={styles.inputCard}>
        <Text style={[styles.label, { color: colors.text }]}>
          {t('settings.lastfm.apiKey')}
        </Text>
        <TextInput
          value={apiKey}
          onChangeText={v => dispatch(setApiKey({ serverId, value: v.trim() }))}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('settings.lastfm.apiKeyPlaceholder')}
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.text }]}
        />

        <Text style={[styles.label, { color: colors.text }]}>
          {t('settings.lastfm.apiSecret')}
        </Text>
        <TextInput
          value={apiSecret}
          onChangeText={v => dispatch(setApiSecret({ serverId, value: v.trim() }))}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t('settings.lastfm.apiSecretPlaceholder')}
          placeholderTextColor={isDarkMode ? '#666' : '#999'}
          style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.text }]}
        />

        <TouchableOpacity
          style={styles.connectivityRow}
          onPress={pendingToken ? handleFinishAuth : undefined}
          disabled={!pendingToken}
          activeOpacity={pendingToken ? 0.6 : 1}
        >
          <Text style={[styles.rowText, { color: colors.text }]}>
            {isAuthenticated
              ? `${t('settings.lastfm.connectedAs')} ${username}`
              : t('settings.lastfm.notConnected')}
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

      {!isAuthenticated && (
        <>
          {pendingToken && (
            <Text style={[styles.pendingText, { color: colors.subtext }]}>
              {t('settings.lastfm.pendingInstruction')}
            </Text>
          )}
          <TouchableOpacity
            style={[styles.connectButton, { backgroundColor: themeColor }]}
            onPress={pendingToken ? handleFinishAuth : handleConnect}
            disabled={isLoading}
          >
            <Text style={styles.connectButtonText}>
              {pendingToken ? t('settings.lastfm.iAuthorized') : t('settings.lastfm.connectWithLastfm')}
            </Text>
          </TouchableOpacity>
        </>
      )}

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
            <Text style={styles.disconnectButtonText}>{t('settings.lastfm.disconnect')}</Text>
          </TouchableOpacity>
        </>
      )}
    </SettingsScreen>
  );
};

export default LastFmView;

const styles = StyleSheet.create({
  inputCard: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  connectivityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 16,
  },
  rowText: { fontSize: 16 },
  pendingText: {
    fontSize: 14,
    marginBottom: 8,
    paddingHorizontal: 4,
    lineHeight: 20,
  },
  connectButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  connectButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  disconnectButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
