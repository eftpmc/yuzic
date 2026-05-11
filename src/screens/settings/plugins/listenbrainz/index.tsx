import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
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
} from '@/utils/redux/slices/listenbrainzSlice';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';

import * as listenbrainz from '@/api/listenbrainz';

const ListenBrainzView: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const { isDarkMode } = useTheme();
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
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <Header title={t('settings.listenBrainz.title')} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            {t('settings.listenBrainz.username')}
          </Text>
          <TextInput
            value={username}
            onChangeText={(v) => dispatch(setUsername({ serverId, value: v.trim() }))}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder={t('settings.listenBrainz.usernamePlaceholder')}
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            style={[styles.input, isDarkMode && styles.inputDark]}
          />

          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
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
            style={[styles.input, isDarkMode && styles.inputDark]}
          />

          <TouchableOpacity style={styles.row} onPress={handlePing}>
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
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
          <TouchableOpacity
            style={[
              styles.disconnectButton,
              isDarkMode && styles.disconnectButtonDark,
            ]}
            onPress={handleDisconnect}
          >
            <MaterialIcons name="logout" size={20} color="#fff" />
            <Text style={styles.disconnectButtonText}>{t('settings.listenBrainz.disconnect')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default ListenBrainzView;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  containerDark: {
    backgroundColor: '#000',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
  },
  sectionDark: {
    backgroundColor: '#111',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  sectionLabelDark: { color: '#fff' },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 4,
    color: '#000',
  },
  labelDark: {
    color: '#fff',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
    color: '#000',
    backgroundColor: '#fff',
  },
  inputDark: {
    borderColor: '#444',
    backgroundColor: '#1a1a1a',
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#e0e0e0', marginVertical: 2 },
  dividerDark: { backgroundColor: '#333' },
  rowText: {
    fontSize: 16,
    color: '#000',
  },
  rowTextDark: {
    color: '#fff',
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  helperTextDark: {
    color: '#aaa',
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
  disconnectButtonDark: {
    backgroundColor: '#FF453A',
  },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
