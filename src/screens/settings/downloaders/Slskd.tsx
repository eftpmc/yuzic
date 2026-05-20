import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
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
import { CheckCircle, Loader2 } from 'lucide-react-native';
import { toast } from '@backpackapp-io/react-native-toast';

import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsAuthCard from '../components/SettingsAuthCard';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsDisconnectButton from '../components/SettingsDisconnectButton';
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

import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { useTheme } from '@/hooks/useTheme';

const SlskdView: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { colors } = useTheme();
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
          if (!cancelled) dispatch(connectSlskd({ serverId }));
        }
      } catch {
        if (!cancelled) {
          dispatch(setSlskdAuthenticated({ serverId, value: false }));
          toast.error(t('settings.downloaders.slskd.connectionFailed'));
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
      await slskd.testConnection(config);
      dispatch(connectSlskd({ serverId }));
    } catch {
      dispatch(setSlskdAuthenticated({ serverId, value: false }));
      toast.error(t('settings.downloaders.slskd.connectionFailed'));
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
      const { currentQueue, finishedItems } = await slskd.fetchQueueWithDiff(config, previousQueueRef.current);
      previousQueueRef.current = currentQueue;
      setQueue(currentQueue);
      if (finishedItems.length > 0) toast(t('settings.downloaders.downloadComplete'));
    } catch {
      console.warn('Queue polling failed');
    }
  }, [config, isAuthenticated, t]);

  useEffect(() => {
    if (!config.serverUrl || !config.apiKey || !isAuthenticated) {
      setQueue([]);
      previousQueueRef.current = [];
      setLoadingQueue(false);
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      return;
    }
    setLoadingQueue(true);
    pollQueue().finally(() => setLoadingQueue(false));
    pollingRef.current = setInterval(pollQueue, 10000);
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [config.serverUrl, config.apiKey, isAuthenticated, pollQueue]);

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
            <Text style={[styles.itemTitle, { color: colors.secondary }]} numberOfLines={1}>
              {item.title || t('settings.downloaders.unknown')}
            </Text>
            <Text style={[styles.itemSub, { color: colors.subtext }]} numberOfLines={1}>
              {[item.artistName, meta].filter(Boolean).join(' · ')}
            </Text>
          </View>
          {isCompleted
            ? <CheckCircle size={16} color="#34C759" />
            : <Text style={[styles.itemPct, { color: colors.subtext }]}>{percent}%</Text>
          }
        </View>
        {!isCompleted && (
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.themeColor, width: `${percent}%` }]} />
          </View>
        )}
      </View>
    );
  };

  if (!activeServer) return null;

  return (
    <SettingsScreen title={t('settings.downloaders.slskd.title')}>
      <SettingsAuthCard
        fields={[
          { label: t('settings.downloaders.serverUrl'), value: serverUrl, onChangeText: v => dispatch(setSlskdServerUrl({ serverId, value: v })), placeholder: t('settings.downloaders.serverUrlPlaceholder.slskd') },
          { label: t('settings.downloaders.apiKey'), value: apiKey, onChangeText: v => dispatch(setSlskdApiKey({ serverId, value: v })), placeholder: t('settings.downloaders.apiKeyPlaceholder'), secureTextEntry: true },
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

export default SlskdView;

const styles = StyleSheet.create({
  divider: { marginTop: 8 },
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
});
