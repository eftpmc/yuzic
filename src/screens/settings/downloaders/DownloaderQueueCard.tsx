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

import SettingsCard from '../components/SettingsCard';
import SettingsCardHeader from '../components/SettingsCardHeader';
import { useTheme } from '@/hooks/useTheme';
import type { DownloaderId } from '@/utils/redux/slices/downloadersSlice';
import { useDownloaderQueue, type QueueDiff } from './useDownloaderQueue';
import type { DownloaderConfig } from './useDownloaderConnection';
import type { RowCancelHelpers } from './DownloaderSettingsScreen';
import { iconSize, spacing, typography } from '@/constants/design';

type Props<T extends { id: string }> = {
  id: DownloaderId;
  /** Optional card title override — the Downloads screen uses this to show
   *  the downloader label (e.g. "Lidarr", "Slskd"); Settings just wants the
   *  default `queue` label. */
  title?: string;
  config: DownloaderConfig;
  isAuthenticated: boolean;
  fetchQueueWithDiff: (config: DownloaderConfig, previous: T[]) => Promise<QueueDiff<T>>;
  renderItem: (item: T, cancel: RowCancelHelpers) => React.ReactElement | null;
  cancelQueueItem?: (config: DownloaderConfig, item: T) => Promise<void>;
};

/**
 * The queue card lifted out of DownloaderSettingsScreen. Renders the polled
 * queue with loading + empty + error states, and drives the cancel flow.
 * Two consumers: the per-downloader settings screen (Lidarr/Slskd views) and
 * the top-level Downloads screen.
 */
function DownloaderQueueCard<T extends { id: string }>({
  id,
  title,
  config,
  isAuthenticated,
  fetchQueueWithDiff,
  renderItem,
  cancelQueueItem,
}: Props<T>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
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

  const renderQueueItem = React.useCallback(
    ({ item }: { item: T }) =>
      renderItem(item, {
        requestCancel: cancelQueueItem
          ? (label: string) => confirmCancel(item, label)
          : undefined,
        isCancelling: cancellingId === item.id,
      }),
    [renderItem, cancelQueueItem, confirmCancel, cancellingId]
  );

  return (
    <SettingsCard>
      <SettingsCardHeader title={title ?? t('settings.downloaders.queue')} />
      {loadingQueue ? (
        <Animated.View style={[styles.queueLoading, spinStyle]}>
          <Loader2 size={iconSize.large} color={colors.secondary} />
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
          renderItem={renderQueueItem}
          scrollEnabled={false}
        />
      )}
    </SettingsCard>
  );
}

export default DownloaderQueueCard;

const styles = StyleSheet.create({
  queueLoading: { alignItems: 'center', paddingVertical: spacing.roomy },
  emptyText: { ...typography.rowSubtitle, textAlign: 'center', marginVertical: spacing.lg },
});
