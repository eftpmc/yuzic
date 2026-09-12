import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import SettingsScreen from '../settings/components/SettingsScreen';
import SettingsCard from '../settings/components/SettingsCard';
import SettingsCardHeader from '../settings/components/SettingsCardHeader';
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
import OfflineSection from './OfflineSection';

/**
 * ONE Downloads screen for the whole app: two sections with different
 * destination/execution semantics, per the locked C5 design.
 *
 * - OFFLINE: what's already saved on this device, from `useDownload()`
 *   (DownloadContext). Extracted into `OfflineSection` so the rendering
 *   lives in one place — this screen and the former standalone
 *   settings-only screen no longer duplicate it.
 * - DOWNLOADERS: server-side acquisition. One card per *connected*
 *   downloader — Lidarr, slskd, and SoulSync (previously omitted here) —
 *   each showing every job its queue endpoint reports, including jobs
 *   started outside Yuzic; downloaders never filter to app-originated
 *   jobs. Live per-downloader counts come from the single shared
 *   `useDownloadersQueue()` poll (mounted once in the home layout); the
 *   per-card `DownloaderQueueCard` still does its own item-level read via
 *   `useDownloaderQueue`, since that hook is the one place providers'
 *   queue payload+cancel wiring already lives — this screen does not spin
 *   up a further, third poll of its own.
 *
 * Reachable from the Home "downloads in progress" banner and from the
 * settings library "Downloads" row (both offline and downloader entry
 * points now land here) and from Library's own "Downloads" row.
 */
const DownloadsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const states = useDownloaderStates();
  const connected = states.filter((s) => s.isConnected);
  // Shared live counts — read-only here, just to confirm the section isn't
  // spinning up its own second poll. The per-item queue data itself still
  // comes from each DownloaderQueueCard's own `useDownloaderQueue` read,
  // which is what actually renders the rows and drives cancel.
  useDownloadersQueue();

  const { renderItem: lidarrRenderItem } = useLidarrRenderItem();
  const slskdRenderItem = useSlskdRenderItem();
  const soulsyncRenderItem = useSoulSyncRenderItem();

  return (
    <SettingsScreen title={t('downloads.title')}>
      <SettingsCardHeader subtle title={t('downloads.section.offline')} />
      <OfflineSection />

      <SettingsCardHeader subtle title={t('downloads.section.downloaders')} />
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
