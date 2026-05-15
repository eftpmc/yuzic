import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Linking,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { CheckCircle, XCircle } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';

import Header from '../../components/Header';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { useTheme } from '@/hooks/useTheme';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import {
  selectLastFmApiKey,
  selectLastFmApiSecret,
  selectLastFmAuthenticated,
  selectLastFmUsername,
} from '@/utils/redux/selectors/lastfmSelectors';
import {
  setApiKey,
  setApiSecret,
  setSessionData,
  disconnect,
  setScrobbleEnabled,
  setNowPlayingEnabled,
} from '@/utils/redux/slices/lastfmSlice';
import {
  selectLastFmScrobbleEnabled,
  selectLastFmNowPlayingEnabled,
} from '@/utils/redux/selectors/lastfmSelectors';
import * as lastfm from '@/api/lastfm';

const LastFmView: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const { isDarkMode } = useTheme();

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
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <Header title={t('settings.lastfm.title')} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            {t('settings.lastfm.apiKey')}
          </Text>
          <TextInput
            value={apiKey}
            onChangeText={(v) => dispatch(setApiKey({ serverId, value: v.trim() }))}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('settings.lastfm.apiKeyPlaceholder')}
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            style={[styles.input, isDarkMode && styles.inputDark]}
          />

          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            {t('settings.lastfm.apiSecret')}
          </Text>
          <TextInput
            value={apiSecret}
            onChangeText={(v) => dispatch(setApiSecret({ serverId, value: v.trim() }))}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('settings.lastfm.apiSecretPlaceholder')}
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            style={[styles.input, isDarkMode && styles.inputDark]}
          />

          <TouchableOpacity
            style={styles.row}
            onPress={pendingToken ? handleFinishAuth : undefined}
            disabled={!pendingToken}
            activeOpacity={pendingToken ? 0.6 : 1}
          >
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
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
        </View>

        {!isAuthenticated && (
          <>
            {pendingToken && (
              <Text style={[styles.pendingText, isDarkMode && styles.pendingTextDark]}>
                {t('settings.lastfm.pendingInstruction')}
              </Text>
            )}
            <TouchableOpacity
              style={[styles.connectButton, { backgroundColor: themeColor }]}
              onPress={pendingToken ? handleFinishAuth : handleConnect}
              disabled={isLoading}
            >
              <Text style={styles.connectButtonText}>
                {pendingToken
                  ? t('settings.lastfm.iAuthorized')
                  : t('settings.lastfm.connectWithLastfm')}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {isAuthenticated && (
          <>
            <View style={[styles.section, isDarkMode && styles.sectionDark]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                    {t('settings.scrobbling.scrobble')}
                  </Text>
                  <Text style={[styles.rowSubtext, isDarkMode && styles.rowSubtextDark]}>
                    {t('settings.scrobbling.scrobbleDescription')}
                  </Text>
                </View>
                <Switch
                  value={scrobbleEnabled}
                  onValueChange={v => { dispatch(setScrobbleEnabled({ serverId, value: v })) }}
                  trackColor={{ true: themeColor }}
                  thumbColor="#fff"
                />
              </View>
              <View style={[styles.divider, isDarkMode && styles.dividerDark]} />
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
                    {t('settings.scrobbling.nowPlaying')}
                  </Text>
                  <Text style={[styles.rowSubtext, isDarkMode && styles.rowSubtextDark]}>
                    {t('settings.scrobbling.nowPlayingDescription')}
                  </Text>
                </View>
                <Switch
                  value={nowPlayingEnabled}
                  onValueChange={v => { dispatch(setNowPlayingEnabled({ serverId, value: v })) }}
                  trackColor={{ true: themeColor }}
                  thumbColor="#fff"
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.disconnectButton, isDarkMode && styles.disconnectButtonDark]}
              onPress={handleDisconnect}
            >
              <MaterialIcons name="logout" size={20} color="#fff" />
              <Text style={styles.disconnectButtonText}>{t('settings.lastfm.disconnect')}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default LastFmView;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  containerDark: { backgroundColor: '#000' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  sectionDark: { backgroundColor: '#111' },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sectionLabelDark: { color: '#fff' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12, color: '#000' },
  labelDark: { color: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    color: '#000',
    backgroundColor: '#fff',
  },
  inputDark: { borderColor: '#444', backgroundColor: '#1a1a1a', color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, gap: 16 },
  rowLeft: { flex: 1 },
  rowText: { fontSize: 16, color: '#000' },
  rowSubtext: { fontSize: 13, color: '#6E6E73', marginTop: 2 },
  rowSubtextDark: { color: '#aaa' },
  rowTextDark: { color: '#fff' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e0e0e0', marginVertical: 2 },
  dividerDark: { backgroundColor: '#333' },
  pendingText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
    paddingHorizontal: 4,
    lineHeight: 20,
  },
  pendingTextDark: { color: '#aaa' },
  connectButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  connectButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  helperText: { fontSize: 14, lineHeight: 20, color: '#555' },
  helperTextDark: { color: '#aaa' },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  disconnectButtonDark: { backgroundColor: '#FF453A' },
  disconnectButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },
});
