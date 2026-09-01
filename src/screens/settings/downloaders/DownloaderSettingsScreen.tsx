import React from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react-native';

import SettingsScreen from '../components/SettingsScreen';
import SettingsCard from '../components/SettingsCard';
import SettingsAuthCard from '../components/SettingsAuthCard';
import SettingsCardHeader from '../components/SettingsCardHeader';
import SettingsDisconnectButton from '../components/SettingsDisconnectButton';
import { useTheme } from '@/hooks/useTheme';
import type { DownloaderId } from '@/utils/redux/slices/downloadersSlice';
import {
  useDownloaderConnection,
  type DownloaderConfig,
} from './useDownloaderConnection';
import { useDownloaderQueue, type QueueDiff } from './useDownloaderQueue';

type Props<T extends { id: string }> = {
  id: DownloaderId;
  testConnection: (config: DownloaderConfig) => Promise<unknown>;
  fetchQueueWithDiff: (config: DownloaderConfig, previous: T[]) => Promise<QueueDiff<T>>;
  /** The one genuinely downloader-specific piece: how a queue entry looks. */
  renderItem: (item: T) => React.ReactElement | null;
  /** Called on disconnect so a screen can drop any extra local state. */
  onDisconnected?: () => void;
};

/**
 * Shared shell for the Lidarr and slskd settings screens. The two used to be
 * near-identical copies, which is how slskd ended up silently swallowing queue
 * errors that Lidarr surfaced.
 */
function DownloaderSettingsScreen<T extends { id: string }>({
  id,
  testConnection,
  fetchQueueWithDiff,
  renderItem,
  onDisconnected,
}: Props<T>) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const {
    activeServer,
    serverUrl,
    apiKey,
    setServerUrl,
    setApiKey,
    isAuthenticated,
    isLoading,
    config,
    ping,
    disconnect,
  } = useDownloaderConnection(id, testConnection);

  const { queue, isLoading: loadingQueue, hasError: queueError } = useDownloaderQueue<T>(
    config,
    isAuthenticated,
    fetchQueueWithDiff
  );

  const rotation = useSharedValue(0);
  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
    return () => cancelAnimation(rotation);
  }, [rotation]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleDisconnect = () => {
    disconnect();
    onDisconnected?.();
  };

  if (!activeServer) return null;

  return (
    <SettingsScreen title={t(`settings.downloaders.${id}.title`)}>
      <SettingsAuthCard
        fields={[
          {
            label: t('settings.downloaders.serverUrl'),
            value: serverUrl,
            onChangeText: setServerUrl,
            placeholder: t(`settings.downloaders.serverUrlPlaceholder.${id}`),
          },
          {
            label: t('settings.downloaders.apiKey'),
            value: apiKey,
            onChangeText: setApiKey,
            placeholder: t('settings.downloaders.apiKeyPlaceholder'),
            secureTextEntry: true,
          },
        ]}
        isAuthenticated={isAuthenticated}
        isLoading={isLoading}
        connectivityLabel={t('settings.downloaders.connectivity')}
        onConnectivityPress={ping}
      />

      <SettingsCard>
        <SettingsCardHeader title={t('settings.downloaders.queue')} />
        {loadingQueue ? (
          <Animated.View style={[styles.queueLoading, spinStyle]}>
            <Loader2 size={32} color={colors.secondary} />
          </Animated.View>
        ) : queueError ? (
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t(`settings.downloaders.${id}.connectionFailed`)}
          </Text>
        ) : queue.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            {t('settings.downloaders.emptyQueue')}
          </Text>
        ) : (
          <FlatList
            data={queue}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => renderItem(item)}
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
}

export default DownloaderSettingsScreen;

/** Shared by both screens' queue rows so the two lists stay visually identical. */
export const downloaderQueueStyles = StyleSheet.create({
  itemRow: { paddingVertical: 10, paddingHorizontal: 16, marginBottom: 4 },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemMain: { flex: 1, minWidth: 0, marginRight: 8 },
  itemTitle: { fontSize: 14, fontWeight: '500' },
  itemSub: { fontSize: 12, marginTop: 2 },
  itemPct: { fontSize: 12 },
  progressTrack: { height: 4, width: '100%', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  warningContainer: { marginTop: 8, padding: 8, borderRadius: 6 },
  warningMessage: { fontSize: 12, marginLeft: 8, marginTop: 2 },
});

const styles = StyleSheet.create({
  queueLoading: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { textAlign: 'center', marginVertical: 16, fontSize: 14 },
});
