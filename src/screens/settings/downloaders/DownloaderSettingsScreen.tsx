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
import { radius, spacing, typography } from '@/constants/design';

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
  itemRow: { paddingVertical: spacing.controlGap, paddingHorizontal: spacing.lg, marginBottom: spacing.xs },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.tight,
  },
  itemMain: { flex: 1, minWidth: 0, marginRight: spacing.sm },
  itemTitle: { ...typography.rowSubtitle, fontWeight: '500' },
  itemSub: { ...typography.caption, marginTop: spacing.xxs },
  itemPct: { ...typography.caption },
  progressTrack: { height: 4, width: '100%', borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.xs },
  warningContainer: { marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.sm },
  warningMessage: { ...typography.caption, marginLeft: spacing.sm, marginTop: spacing.xxs },
});

const styles = StyleSheet.create({
  queueLoading: { alignItems: 'center', paddingVertical: spacing.roomy },
  emptyText: { ...typography.rowSubtitle, textAlign: 'center', marginVertical: spacing.lg },
});
