import React, { useCallback, useMemo, useState } from 'react';
import { Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from '@backpackapp-io/react-native-toast';

import SettingsScreen from '../../components/SettingsScreen';
import SettingsAuthCard from '../../components/SettingsAuthCard';
import SettingsToggleGroup from '../../components/SettingsToggleGroup';
import SettingsCardHeader from '../../components/SettingsCardHeader';
import SettingsDisconnectButton from '../../components/SettingsDisconnectButton';
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
  selectLastFmSimilarArtistsEnabled,
} from '@/utils/redux/selectors/lastfmSelectors';
import {
  setApiKey,
  setApiSecret,
  setSessionData,
  disconnect,
  setScrobbleEnabled,
  setNowPlayingEnabled,
  setSimilarArtistsEnabled,
} from '@/utils/redux/slices/lastfmSlice';
import * as lastfm from '@/api/lastfm';

const LastFmView: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const { colors } = useTheme();

  const activeServer = useSelector(selectActiveServer);
  const serverId = activeServer?.id ?? '';
  const apiKey = useSelector(selectLastFmApiKey);
  const apiSecret = useSelector(selectLastFmApiSecret);
  const isAuthenticated = useSelector(selectLastFmAuthenticated);
  const username = useSelector(selectLastFmUsername);
  const scrobbleEnabled = useSelector(selectLastFmScrobbleEnabled);
  const nowPlayingEnabled = useSelector(selectLastFmNowPlayingEnabled);
  const similarArtistsEnabled = useSelector(selectLastFmSimilarArtistsEnabled);

  const toggleSimilarArtists = useCallback((v: boolean) => { dispatch(setSimilarArtistsEnabled({ serverId, value: v })); }, [dispatch, serverId]);
  const toggleScrobble = useCallback((v: boolean) => { dispatch(setScrobbleEnabled({ serverId, value: v })); }, [dispatch, serverId]);
  const toggleNowPlaying = useCallback((v: boolean) => { dispatch(setNowPlayingEnabled({ serverId, value: v })); }, [dispatch, serverId]);

  const similarArtistsItems = useMemo(() => [
    { label: t('settings.lastfm.similarArtists'), subtext: t('settings.lastfm.similarArtistsDescription'), value: similarArtistsEnabled, onValueChange: toggleSimilarArtists },
  ], [t, similarArtistsEnabled, toggleSimilarArtists]);

  const scrobbleItems = useMemo(() => [
    { label: t('settings.scrobbling.scrobble'), subtext: t('settings.scrobbling.scrobbleDescription'), value: scrobbleEnabled, onValueChange: toggleScrobble },
    { label: t('settings.scrobbling.nowPlaying'), subtext: t('settings.scrobbling.nowPlayingDescription'), value: nowPlayingEnabled, onValueChange: toggleNowPlaying },
  ], [t, scrobbleEnabled, nowPlayingEnabled, toggleScrobble, toggleNowPlaying]);

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
      <SettingsAuthCard
        fields={[
          { label: t('settings.lastfm.apiKey'), value: apiKey, onChangeText: v => dispatch(setApiKey({ serverId, value: v.trim() })), placeholder: t('settings.lastfm.apiKeyPlaceholder') },
          { label: t('settings.lastfm.apiSecret'), value: apiSecret, onChangeText: v => dispatch(setApiSecret({ serverId, value: v.trim() })), placeholder: t('settings.lastfm.apiSecretPlaceholder'), secureTextEntry: true },
        ]}
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        connectivityLabel={isAuthenticated ? `${t('settings.lastfm.connectedAs')} ${username}` : t('settings.lastfm.notConnected')}
      />

      {!isAuthenticated && (
        <>
          {pendingToken && (
            <Text style={[styles.hint, { color: colors.subtext }]}>
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

      <SettingsCardHeader subtle title={t('common.artist')} />
      <SettingsToggleGroup items={similarArtistsItems} />

      {isAuthenticated && (
        <>
          <SettingsToggleGroup items={scrobbleItems} />

          <SettingsDisconnectButton
            label={t('settings.lastfm.disconnect')}
            onPress={handleDisconnect}
          />
        </>
      )}
    </SettingsScreen>
  );
};

export default LastFmView;

const styles = StyleSheet.create({
  divider: { marginTop: 8 },
  hint: {
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 8,
    marginLeft: 4,
  },
  connectButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
