import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { Loader2 } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';

import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsAuthCard from '../components/SettingsAuthCard';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsDisconnectButton from '../components/SettingsDisconnectButton';
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

import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useTheme } from '@/hooks/useTheme';

const LidarrView: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
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

  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(withTiming(360, { duration: 1000, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(rotation);
  }, [rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

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
          if (!cancelled) dispatch(connectLidarr({ serverId }));
        }
      } catch {
        if (!cancelled) {
          dispatch(setLidarrAuthenticated({ serverId, value: false }));
          toast.error(t('settings.downloaders.lidarr.connectionFailed'));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }, 500);

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [apiKey, config, dispatch, isAuthenticated, serverId, serverUrl, t]);

  const handlePing = useCallback(async () => {
    if (!config.serverUrl || !config.apiKey || isLoading) return;
    setIsLoading(true);
    try {
      await lidarr.testConnection(config);
      dispatch(connectLidarr({ serverId }));
    } catch {
      dispatch(setLidarrAuthenticated({ serverId, value: false }));
      toast.error(t('settings.downloaders.lidarr.connectionFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [config, dispatch, isLoading, serverId, t]);

  useEffect(() => {
    if (!isAuthenticated) {
      setQueue([]);
      previousQueueRef.current = [];
    }
  }, [isAuthenticated]);

  const pollQueue = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const { currentQueue, finishedItems } = await lidarr.fetchQueueWithDiff(config, previousQueueRef.current);
      previousQueueRef.current = currentQueue;
      setQueue(currentQueue);
      setQueueError(false);
      if (finishedItems.length > 0) toast(t('settings.downloaders.downloadComplete'));
    } catch {
      setQueueError(true);
    }
  }, [config, isAuthenticated, t]);

  useEffect(() => {
    if (!config.serverUrl || !config.apiKey || !isAuthenticated) {
      setQueue([]);
      previousQueueRef.current = [];
      setLoadingQueue(false);
      setQueueError(false);
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    setLoadingQueue(true);
    pollQueue().finally(() => setLoadingQueue(false));
    pollingRef.current = setInterval(pollQueue, 10000);
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [config.serverUrl, config.apiKey, isAuthenticated, pollQueue]);

  const handleDisconnect = () => {
    dispatch(disconnectLidarr({ serverId }));
    setQueue([]);
    previousQueueRef.current = [];
    toast(t('settings.downloaders.lidarr.disconnected'));
  };

  const renderDownloadItem = ({ item }: { item: LidarrQueueRecord }) => {
    const percent = Math.min(100, item.percentComplete ?? 0);
    const meta = item.trackCount > 0 ? `${item.trackCount} ${t('settings.downloaders.tracks', { count: item.trackCount })}` : '';
    const hasWarnings = item.statusMessages?.length > 0;
    const isExpanded = expandedItemId === item.id;

    return (
      <Pressable style={styles.itemRow} onPress={() => hasWarnings && setExpandedItemId(isExpanded ? null : item.id)}>
        <View style={styles.itemHeader}>
          <View style={styles.itemMain}>
            <Text style={[styles.itemTitle, { color: colors.secondary }]} numberOfLines={1}>
              {item.albumTitle || t('settings.downloaders.unknownAlbum')}
            </Text>
            <Text style={[styles.itemSub, { color: colors.subtext }]} numberOfLines={1}>
              {[item.artistName, meta].filter(Boolean).join(' · ')}
            </Text>
          </View>
          <Text style={[styles.itemPct, { color: colors.subtext }]}>{percent}%</Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { backgroundColor: colors.themeColor, width: `${percent}%` }]} />
        </View>
        {hasWarnings && isExpanded && (
          <View style={[styles.warningContainer, { backgroundColor: colors.muted }]}>
            {item.statusMessages.map((msg, idx) => (
              <Text key={idx} style={[styles.warningMessage, { color: colors.subtext }]}>• {msg.title}</Text>
            ))}
          </View>
        )}
      </Pressable>
    );
  };

  if (!activeServer) return null;

  return (
    <SettingsScreen title={t('settings.downloaders.lidarr.title')}>
      <SettingsAuthCard
        fields={[
          { label: t('settings.downloaders.serverUrl'), value: serverUrl, onChangeText: v => dispatch(setLidarrServerUrl({ serverId, value: v })), placeholder: t('settings.downloaders.serverUrlPlaceholder.lidarr') },
          { label: t('settings.downloaders.apiKey'), value: apiKey, onChangeText: v => dispatch(setLidarrApiKey({ serverId, value: v })), placeholder: t('settings.downloaders.apiKeyPlaceholder'), secureTextEntry: true },
        ]}
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        connectivityLabel={t('settings.downloaders.connectivity')}
        onConnectivityPress={handlePing}
      />

      <SettingsCard>
        <SettingsCardHeader title={t('settings.downloaders.queue')} />
        {loadingQueue ? (
          <Animated.View style={[styles.queueLoading, spinStyle]}>
            <Loader2 size={32} color={colors.secondary} />
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
            keyExtractor={i => i.id}
            renderItem={renderDownloadItem}
            scrollEnabled={false}
          />
        )}
      </SettingsCard>

      {isAuthenticated && (
        <SettingsDisconnectButton
          label={t('settings.downloaders.disconnect')}
          onPress={handleDisconnect}
        />
      )}
    </SettingsScreen>
  );
};

export default LidarrView;

const styles = StyleSheet.create({
  queueLoading: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { textAlign: 'center', marginVertical: 16, fontSize: 14 },
  itemRow: { paddingVertical: 10, paddingHorizontal: 16, marginBottom: 4 },
  itemHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 },
  itemMain: { flex: 1, minWidth: 0, marginRight: 8 },
  itemTitle: { fontSize: 14, fontWeight: '500' },
  itemSub: { fontSize: 12, marginTop: 2 },
  itemPct: { fontSize: 12 },
  progressTrack: { height: 4, width: '100%', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  warningContainer: { marginTop: 8, padding: 8, borderRadius: 6 },
  warningMessage: { fontSize: 12, marginLeft: 8, marginTop: 2 },
});
