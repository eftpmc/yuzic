import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Pressable,
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
import * as lidarr from '@/api/lidarr';
import type { LidarrQueueRecord } from '@/api/lidarr';

import {
  selectLidarrServerUrl,
  selectLidarrApiKey,
  selectLidarrAuthenticated,
  selectLidarrConfig,
} from '@/utils/redux/selectors/downloadersSelectors';
import {
  setLidarrServerUrl,
  setLidarrApiKey,
  setLidarrAuthenticated,
  connectLidarr,
  disconnectLidarr,
} from '@/utils/redux/slices/downloadersSlice';

import { selectThemeColor } from '@/utils/redux/selectors/settingsSelectors';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useTheme } from '@/hooks/useTheme';

const LidarrView: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const themeColor = useSelector(selectThemeColor);
  const { isDarkMode, colors } = useTheme();
  const activeServer = useSelector(selectActiveServer);
  const serverId = activeServer?.id ?? '';

  const serverUrl = useSelector(selectLidarrServerUrl);
  const apiKey = useSelector(selectLidarrApiKey);
  const isAuthenticated = useSelector(selectLidarrAuthenticated);
  const config = useSelector(selectLidarrConfig);

  const [isLoading, setIsLoading] = useState(false);
  const [queue, setQueue] = useState<LidarrQueueRecord[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [queueError, setQueueError] = useState(false);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const previousQueueRef = useRef<LidarrQueueRecord[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => animation.stop();
  }, [spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  useEffect(() => {
    if (!serverUrl || !apiKey) {
      dispatch(setLidarrAuthenticated({ serverId, value: false }));
      return;
    }

    if (isAuthenticated) return;

    let cancelled = false;
    const timeout = setTimeout(async () => {
      setIsLoading(true);

      try {
        if (config.serverUrl && config.apiKey) {
          await lidarr.testConnection(config);

          if (!cancelled) {
            dispatch(connectLidarr({ serverId }));
          }
        }
      } catch {
        if (!cancelled) {
          dispatch(setLidarrAuthenticated({ serverId, value: false }));
          toast.error(t('settings.downloaders.lidarr.connectionFailed'));
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
  }, [apiKey, config, dispatch, isAuthenticated, serverId, serverUrl, t]);

  useEffect(() => {
    if (!isAuthenticated) {
      setQueue([]);
      previousQueueRef.current = [];
    }
  }, [isAuthenticated]);

  const pollQueue = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const { currentQueue, finishedItems } =
        await lidarr.fetchQueueWithDiff(config, previousQueueRef.current);

      previousQueueRef.current = currentQueue;
      setQueue(currentQueue);
      setQueueError(false);

      if (finishedItems.length > 0) {
        toast(t('settings.downloaders.downloadComplete'));
      }
    } catch (err) {
      console.warn('Queue polling failed', err);
      setQueueError(true);
    }
  }, [config, isAuthenticated, t]);

  useEffect(() => {
    if (!config.serverUrl || !config.apiKey || !isAuthenticated) {
      setQueue([]);
      previousQueueRef.current = [];
      setLoadingQueue(false);
      setQueueError(false);

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
  }, [config.serverUrl, config.apiKey, isAuthenticated, pollQueue]);

  const handleDisconnect = () => {
    dispatch(disconnectLidarr({ serverId }));
    setQueue([]);
    previousQueueRef.current = [];
    toast(t('settings.downloaders.lidarr.disconnected'));
  };

  const toggleExpand = (id: string) => {
    setExpandedItemId(expandedItemId === id ? null : id);
  };

  const renderDownloadItem = ({ item }: { item: LidarrQueueRecord }) => {
    const percent = Math.min(100, item.percentComplete ?? 0);
    const meta = item.trackCount > 0 ? `${item.trackCount} ${t('settings.downloaders.tracks', { count: item.trackCount })}` : '';
    const hasWarnings = item.statusMessages?.length > 0;
    const isExpanded = expandedItemId === item.id;

    return (
      <View style={styles.itemRow}>
        <Pressable onPress={() => hasWarnings && toggleExpand(item.id)}>
          <View style={styles.itemHeader}>
            <View style={styles.itemMain}>
              <Text
                style={[styles.itemTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.albumTitle || t('settings.downloaders.unknownAlbum')}
              </Text>
              <Text
                style={[styles.itemSub, { color: colors.subtext }]}
                numberOfLines={1}
              >
                {[item.artistName, meta].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Text style={[styles.itemPct, { color: colors.subtext }]}>
              {percent}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: themeColor, width: `${percent}%` },
              ]}
            />
          </View>
          {hasWarnings && isExpanded && (
            <View style={[styles.warningContainer, { backgroundColor: colors.muted }]}>
              {item.statusMessages.map((msg, idx) => (
                <Text
                  key={idx}
                  style={[styles.warningMessage, { color: colors.subtext }]}
                >
                  • {msg.title}
                </Text>
              ))}
            </View>
          )}
        </Pressable>
      </View>
    );
  };

  if (!activeServer) return null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title={t('settings.downloaders.lidarr.title')} />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>
            {t('settings.downloaders.serverUrl')}
          </Text>
          <TextInput
            value={serverUrl}
            onChangeText={(v) => dispatch(setLidarrServerUrl({ serverId, value: v }))}
            placeholder={t('settings.downloaders.serverUrlPlaceholder.lidarr')}
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.text }]}
          />

          <Text style={[styles.label, { color: colors.text }]}>
            {t('settings.downloaders.apiKey')}
          </Text>
          <TextInput
            value={apiKey}
            onChangeText={(v) => dispatch(setLidarrApiKey({ serverId, value: v }))}
            placeholder={t('settings.downloaders.apiKeyPlaceholder')}
            placeholderTextColor={isDarkMode ? '#666' : '#999'}
            secureTextEntry
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.muted, color: colors.text }]}
          />

          <View style={styles.row}>
            <Text style={[styles.rowText, { color: colors.text }]}>
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

        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <Text style={[styles.label, { color: colors.text }]}>
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
              <Loader2 size={32} color={colors.text} />
            </Animated.View>
          ) : queueError ? (
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
              {t('settings.downloaders.lidarr.connectionFailed')}
            </Text>
          ) : queue.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.subtext }]}>
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

        {isAuthenticated && (
          <TouchableOpacity
            style={[styles.disconnectButton, isDarkMode && styles.disconnectButtonDark]}
            onPress={handleDisconnect}
          >
            <MaterialIcons name="logout" size={20} color="#fff" />
            <Text style={styles.disconnectButtonText}>{t('settings.downloaders.disconnect')}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default LidarrView;

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
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
  helperText: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 4 },
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
  },
  rowText: { fontSize: 16 },
  emptyText: {
    textAlign: 'center',
    marginVertical: 12,
    fontSize: 14,
  },
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
  itemTitle: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 12, marginTop: 2 },
  itemPct: { fontSize: 12 },
  progressTrack: {
    height: 4,
    width: '100%',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  warningContainer: {
    marginTop: 8,
    padding: 8,
    borderRadius: 6,
  },
  warningMessage: { fontSize: 12, marginLeft: 8, marginTop: 2 },
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
