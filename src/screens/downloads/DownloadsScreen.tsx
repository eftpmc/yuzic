import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import SettingsScreen from '../settings/components/SettingsScreen';
import SettingsCard from '../settings/components/SettingsCard';
import DownloaderQueueCard from '../settings/downloaders/DownloaderQueueCard';
import { useLidarrRenderItem } from '../settings/downloaders/useLidarrRenderItem';
import { useSlskdRenderItem } from '../settings/downloaders/useSlskdRenderItem';
import { useSoulSyncRenderItem } from '../settings/downloaders/useSoulSyncRenderItem';
import { useDownloaderStates } from '@/features/downloaders/registry';
import { useDownloadersQueue } from '@/features/downloaders/DownloadersQueueContext';
import type { LidarrQueueRecord } from '@/api/lidarr';
import type { SlskdQueueRecord } from '@/api/slskd';
import type { SoulSyncQueueRecord } from '@/api/soulsync';
import * as lidarr from '@/api/lidarr';
import * as slskd from '@/api/slskd';
import * as soulsync from '@/api/soulsync';
import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/constants/design';

/**
 * The Downloads screen is **server transfers only** — the live acquisition
 * queue of every connected downloader (Lidarr, slskd, SoulSync), each showing
 * every job its queue endpoint reports, including jobs started outside Yuzic.
 *
 * On-device saved music does NOT live here: that is the Library's "Downloaded"
 * view, which is a filter over what you already own. The two were merged onto
 * one screen once and read as one confusing pile of "downloads"; they are
 * different things — one is storage you hold, the other is work in flight — so
 * they live apart. This screen never shows offline storage stats.
 *
 * Live per-downloader counts come from the single shared `useDownloadersQueue()`
 * poll (mounted once in the home layout); the per-card `DownloaderQueueCard`
 * still does its own item-level read via `useDownloaderQueue`, so this screen
 * does not spin up a further poll of its own.
 *
 * Reachable from the Home "downloads in progress" banner and Library's
 * "Downloads" row.
 */
const DownloadsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const states = useDownloaderStates();
  const connected = states.filter((s) => s.isConnected);
  useDownloadersQueue();

  const { renderItem: lidarrRenderItem } = useLidarrRenderItem();
  const slskdRenderItem = useSlskdRenderItem();
  const soulsyncRenderItem = useSoulSyncRenderItem();

  return (
    <SettingsScreen title={t('downloads.title')}>
      {connected.length === 0 && (
        <SettingsCard>
          <Text style={[styles.empty, { color: colors.subtext }]}>
            {t('downloads.noDownloaders')}
          </Text>
        </SettingsCard>
      )}

      {connected.map((state) => {
        const key = state.def.id;
        if (key === 'lidarr') {
          return (
            <DownloaderQueueCard<LidarrQueueRecord>
              key={key}
              id="lidarr"
              title={state.def.label}
              config={{ serverUrl: state.config.serverUrl, apiKey: state.config.apiKey }}
              isAuthenticated
              fetchQueueWithDiff={lidarr.fetchQueueWithDiff}
              cancelQueueItem={lidarr.cancelQueueItem}
              renderItem={lidarrRenderItem}
            />
          );
        }
        if (key === 'slskd') {
          return (
            <DownloaderQueueCard<SlskdQueueRecord>
              key={key}
              id="slskd"
              title={state.def.label}
              config={{ serverUrl: state.config.serverUrl, apiKey: state.config.apiKey }}
              isAuthenticated
              fetchQueueWithDiff={slskd.fetchQueueWithDiff}
              cancelQueueItem={slskd.cancelQueueItem}
              renderItem={slskdRenderItem}
            />
          );
        }
        if (key === 'soulsync') {
          return (
            <DownloaderQueueCard<SoulSyncQueueRecord>
              key={key}
              id="soulsync"
              title={state.def.label}
              config={{ serverUrl: state.config.serverUrl, apiKey: state.config.apiKey }}
              isAuthenticated
              fetchQueueWithDiff={soulsync.fetchQueueWithDiff}
              cancelQueueItem={(config, item) => soulsync.cancelDownload(config, item)}
              renderItem={soulsyncRenderItem}
            />
          );
        }
        return null;
      })}
    </SettingsScreen>
  );
};

export default DownloadsScreen;

const styles = StyleSheet.create({
  empty: { ...typography.rowSubtitle, textAlign: 'center', marginVertical: spacing.lg },
});
