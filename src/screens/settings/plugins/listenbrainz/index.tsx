import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  StyleSheet,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { CheckCircle, XCircle } from 'lucide-react-native';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { toast } from '@backpackapp-io/react-native-toast';

import Header from '../../components/Header';
import { useTheme } from '@/hooks/useTheme';
import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';

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
  setScrobbleEnabled,
  setNowPlayingEnabled,
} from '@/utils/redux/slices/listenbrainzSlice';
import {
  selectListenBrainzScrobbleEnabled,
  selectListenBrainzNowPlayingEnabled,
} from '@/utils/redux/selectors/listenbrainzSelectors';
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
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 500); // debounce

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t('settings.listenBrainz.title')} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('settings.listenBrainz.username')}
          </Text>
          <TextInput
            value={username}
            onChangeText={(v) => dispatch(setUsername({ serverId, value: v.trim() }))}
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
            onChangeText={(v) => dispatch(setToken({ serverId, value: v.trim() }))}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('settings.listenBrainz.tokenPlaceholder')}
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.text }]}
          />

          <TouchableOpacity style={styles.row} onPress={handlePing}>
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
        </View>

        {isAuthenticated && (
          <>
            <View style={[styles.section, { backgroundColor: colors.card }]}>
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={[styles.rowText, { color: colors.text }]}>
                    {t('settings.scrobbling.scrobble')}
                  </Text>
                  <Text style={[styles.rowSubtext, { color: colors.subtext }]}>
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
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={[styles.rowText, { color: colors.text }]}>
                    {t('settings.scrobbling.nowPlaying')}
                  </Text>
                  <Text style={[styles.rowSubtext, { color: colors.subtext }]}>
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
              style={styles.disconnectButton}
              onPress={handleDisconnect}
            >
              <MaterialIcons name="logout" size={20} color="#fff" />
              <Text style={styles.disconnectButtonText}>{t('settings.listenBrainz.disconnect')}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ListenBrainzView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    gap: 16,
  },
  rowLeft: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  rowSubtext: { fontSize: 13, marginTop: 2 },
  rowText: {
    fontSize: 16,
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
  },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
