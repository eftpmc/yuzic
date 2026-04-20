import React, { useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@expo/vector-icons';
import { CheckCircle, Loader2, XCircle } from 'lucide-react-native';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import { toast } from '@backpackapp-io/react-native-toast';

import Header from '../components/Header';
import * as slskd from '@/api/slskd';
import type { SlskdQueueRecord } from '@/api/slskd';

import {
  selectSlskdServerUrl,
  selectSlskdApiKey,
  selectSlskdAuthenticated,
  selectSlskdConfig,
} from '@/utils/redux/selectors/downloadersSelectors';
import {
  setSlskdServerUrl,
  setSlskdApiKey,
  setSlskdAuthenticated,
  connectSlskd,
  disconnectSlskd,
} from '@/utils/redux/slices/downloadersSlice';

import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useTheme } from '@/hooks/useTheme';

const SlskdView: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const { isDarkMode } = useTheme();
  const activeServer = useSelector(selectActiveServer);
  const serverId = activeServer?.id ?? '';

  const serverUrl = useSelector(selectSlskdServerUrl);
  const apiKey = useSelector(selectSlskdApiKey);
  const isAuthenticated = useSelector(selectSlskdAuthenticated);
  const config = useSelector(selectSlskdConfig);

  const [isLoading, setIsLoading] = useState(false);
  const [queue, setQueue] = useState<SlskdQueueRecord[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  const previousQueueRef = useRef<SlskdQueueRecord[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    if (!serverUrl || !apiKey) {
      dispatch(setSlskdAuthenticated({ serverId, value: false }));
      return;
    }

    if (isAuthenticated) return;

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsLoading(true);

      try {
        if (config.serverUrl && config.apiKey) {
          await slskd.testConnection(config);

          if (!cancelled) {
            dispatch(connectSlskd({ serverId }));
          }
        }
      } catch {
        if (!cancelled) {
          dispatch(setSlskdAuthenticated({ serverId, value: false }));
          toast.error(t('settings.downloaders.slskd.connectionFailed'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [serverUrl, apiKey]);

  useEffect(() => {
    if (!isAuthenticated) {
      setQueue([]);
      previousQueueRef.current = [];
    }
  }, [isAuthenticated]);

  const pollQueue = async () => {
    if (!isAuthenticated) return;

    try {
      const { currentQueue, finishedItems } =
        await slskd.fetchQueueWithDiff(config, previousQueueRef.current);

      previousQueueRef.current = currentQueue;
      setQueue(currentQueue);

      if (finishedItems.length > 0) {
        toast(t('settings.downloaders.downloadComplete'));
      }
    } catch {
      console.warn('Queue polling failed');
    }
  };

  useEffect(() => {
    if (!config.serverUrl || !config.apiKey || !isAuthenticated) {
      setQueue([]);
      previousQueueRef.current = [];
      setLoadingQueue(false);

      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    setLoadingQueue(true);
    pollQueue().finally(() => setLoadingQueue(false));

    pollingRef.current = setInterval(pollQueue, 10000);

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [config.serverUrl, config.apiKey, isAuthenticated]);

  const handleDisconnect = () => {
    dispatch(disconnectSlskd({ serverId }));
    setQueue([]);
    previousQueueRef.current = [];
    toast(t('settings.downloaders.slskd.disconnected'));
  };

  const renderDownloadItem = ({ item }: { item: SlskdQueueRecord }) => {
    const isCompleted = item.state.toLowerCase() === 'completed';
    const percent = Math.min(100, item.percentComplete ?? 0);
    const meta = item.fileCount > 0 ? `${item.fileCount} ${t('settings.downloaders.files', { count: item.fileCount })}` : '';

    return (
      <View style={styles.itemRow}>
        <View style={styles.itemHeader}>
          <View style={styles.itemMain}>
            <Text
              style={[styles.itemTitle, isDarkMode && styles.itemTitleDark]}
              numberOfLines={1}
            >
              {item.title || t('settings.downloaders.unknown')}
            </Text>
            <Text
              style={[styles.itemSub, isDarkMode && styles.itemSubDark]}
              numberOfLines={1}
            >
              {[item.artistName, meta].filter(Boolean).join(' · ')}
            </Text>
          </View>
          {isCompleted ? (
            <CheckCircle size={16} color="#34C759" />
          ) : (
            <Text style={[styles.itemPct, isDarkMode && styles.itemPctDark]}>
              {percent}%
            </Text>
          )}
        </View>
        {!isCompleted && (
          <View
            style={[
              styles.progressTrack,
              isDarkMode && styles.progressTrackDark,
            ]}
          >
            <View
              style={[
                styles.progressFill,
                { backgroundColor: themeColor, width: `${percent}%` },
              ]}
            />
          </View>
        )}
      </View>
    );
  };

  if (!activeServer) return null;

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <Header title={t('settings.downloaders.slskd.title')} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            {t('settings.downloaders.serverUrl')}
          </Text>
          <TextInput
            value={serverUrl}
            onChangeText={(v) => dispatch(setSlskdServerUrl({ serverId, value: v }))}
            placeholder={t('settings.downloaders.serverUrlPlaceholder.slskd')}
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            style={[styles.input, isDarkMode && styles.inputDark]}
          />

          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            {t('settings.downloaders.apiKey')}
          </Text>
          <TextInput
            value={apiKey}
            onChangeText={(v) => dispatch(setSlskdApiKey({ serverId, value: v }))}
            placeholder={t('settings.downloaders.apiKeyPlaceholder')}
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            secureTextEntry
            style={[styles.input, isDarkMode && styles.inputDark]}
          />

          <View style={styles.row}>
            <Text style={[styles.rowText, isDarkMode && styles.rowTextDark]}>
              {t('settings.downloaders.connectivity')}
            </Text>

            {isLoading ? (
              <SpinningLoaderCircle size={20} color={themeColor} />
            ) : isAuthenticated ? (
              <CheckCircle size={20} color={themeColor} />
            ) : (
              <XCircle size={20} color="red" />
            )}
          </View>
        </View>

        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <Text style={[styles.label, isDarkMode && styles.labelDark]}>
            {t('settings.downloaders.queue')}
          </Text>

          {loadingQueue ? (
            <Animated.View
              style={{
                alignItems: 'center',
                marginTop: 20,
                transform: [{ rotate: spin }],
              }}
            >
              <Loader2 size={32} color={isDarkMode ? '#fff' : '#000'} />
            </Animated.View>
          ) : queue.length === 0 ? (
            <Text style={[styles.emptyText, isDarkMode && styles.emptyTextDark]}>
              {t('settings.downloaders.emptyQueue')}
            </Text>
          ) : (
            <FlatList
              data={queue}
              keyExtractor={(i) => i.id}
              renderItem={renderDownloadItem}
              scrollEnabled={false}
            />
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.disconnectButton,
            isDarkMode && styles.disconnectButtonDark,
          ]}
          onPress={handleDisconnect}
        >
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.disconnectButtonText}>{t('settings.downloaders.disconnect')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SlskdView;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  containerDark: { backgroundColor: '#000' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 24,
  },
  sectionDark: { backgroundColor: '#111' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, color: '#000' },
  labelDark: { color: '#fff' },
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
    marginTop: 12,
  },
  rowText: { fontSize: 16, color: '#000' },
  rowTextDark: { color: '#fff' },
  emptyText: {
    textAlign: 'center',
    marginVertical: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyTextDark: { color: '#aaa' },
  itemRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemMain: { flex: 1, minWidth: 0, marginRight: 8 },
  itemTitle: { fontSize: 14, fontWeight: '600', color: '#000' },
  itemTitleDark: { color: '#fff' },
  itemSub: { fontSize: 12, color: '#666', marginTop: 2 },
  itemSubDark: { color: '#aaa' },
  itemPct: { fontSize: 12, color: '#888' },
  itemPctDark: { color: '#888' },
  progressTrack: {
    height: 4,
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressTrackDark: { backgroundColor: '#333' },
  progressFill: { height: '100%', borderRadius: 2 },
  disconnectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  disconnectButtonDark: { backgroundColor: '#FF453A' },
  disconnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
