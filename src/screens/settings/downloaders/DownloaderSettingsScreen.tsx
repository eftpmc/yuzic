import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import SettingsScreen from '../components/SettingsScreen';
import SettingsAuthCard from '../components/SettingsAuthCard';
import SettingsDisconnectButton from '../components/SettingsDisconnectButton';
import type { DownloaderId } from '@/utils/redux/slices/downloadersSlice';
import {
  useDownloaderConnection,
  type DownloaderConfig,
} from './useDownloaderConnection';
import type { QueueDiff } from './useDownloaderQueue';
import { radius, spacing, typography } from '@/constants/design';
import DownloaderQueueCard from './DownloaderQueueCard';

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
  /**
   * Downloader-specific extras rendered between the queue and the disconnect
   * button — search preferences, filters, anything that only one downloader has.
   */
  extraCards?: React.ReactNode;
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
  extraCards,
  onDisconnected,
}: Props<T>) {
  const { t } = useTranslation();

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

      <DownloaderQueueCard<T>
        id={id}
        config={config}
        isAuthenticated={isAuthenticated}
        fetchQueueWithDiff={fetchQueueWithDiff}
        renderItem={renderItem}
        cancelQueueItem={cancelQueueItem}
      />

      {isAuthenticated && extraCards}

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
