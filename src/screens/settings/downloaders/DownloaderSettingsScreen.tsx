import React from 'react';
import { Alert, FlatList, StyleSheet, Text } from 'react-native';
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
import { toast } from '@backpackapp-io/react-native-toast';

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
  /**
   * The one genuinely downloader-specific piece: how a queue entry looks.
   *
   * `cancel` is passed through so the row can decide how to draw the cancel
   * control (trailing icon, in a header, etc.) and expose the loading state.
   */
  renderItem: (item: T, cancel: RowCancelHelpers) => React.ReactElement | null;
  /**
   * Cancels the given queue entry. Returns when the downloader has accepted the
   * request; the screen shows an "is cancelling" spinner while the promise runs.
   */
  cancelQueueItem?: (config: DownloaderConfig, item: T) => Promise<void>;
  /** Called on disconnect so a screen can drop any extra local state. */
  onDisconnected?: () => void;
};

export type RowCancelHelpers = {
  /**
   * Shows the "are you sure?" prompt for cancelling this row. Pass the label
   * to name in the prompt (album title, folder name — whatever the row uses).
   * Undefined when the screen has no cancel implementation, so the row can
   * hide its control entirely instead of drawing a button that does nothing.
   */
  requestCancel?: (label: string) => void;
  isCancelling: boolean;
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
  cancelQueueItem,
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

  const [cancellingId, setCancellingId] = React.useState<string | null>(null);

  const runCancel = React.useCallback(
    async (item: T) => {
      if (!cancelQueueItem) return;
      setCancellingId(item.id);
      try {
        await cancelQueueItem(config, item);
        toast.success(t('settings.downloaders.cancelled'));
      } catch {
        toast.error(t('settings.downloaders.cancelFailed'));
      } finally {
        setCancellingId((current) => (current === item.id ? null : current));
      }
    },
    [cancelQueueItem, config, t]
  );

  const confirmCancel = React.useCallback(
    (item: T, label: string) => {
      Alert.alert(
        t('settings.downloaders.cancelTitle'),
        t('settings.downloaders.cancelBody', { title: label }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('settings.downloaders.cancelConfirm'),
            style: 'destructive',
            onPress: () => runCancel(item),
          },
        ]
      );
    },
    [runCancel, t]
  );

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
            renderItem={({ item }) =>
              renderItem(item, {
                requestCancel: cancelQueueItem
                  ? (label) => confirmCancel(item, label)
                  : undefined,
                isCancelling: cancellingId === item.id,
              })
            }
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
  // borderRadius is applied at the callsite from useRadius() so the pill
  // shape follows the user's radius preset live.
  progressTrack: { height: 4, width: '100%', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radius.xs },
  warningContainer: { marginTop: spacing.sm, padding: spacing.sm, borderRadius: radius.sm },
  warningMessage: { ...typography.caption, marginLeft: spacing.sm, marginTop: spacing.xxs },
  headerTrailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cancelButton: { padding: spacing.xxs, marginLeft: spacing.xs },
});

const styles = StyleSheet.create({
  queueLoading: { alignItems: 'center', paddingVertical: spacing.roomy },
  emptyText: { ...typography.rowSubtitle, textAlign: 'center', marginVertical: spacing.lg },
});
