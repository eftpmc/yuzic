import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import SettingsScreen from '../settings/components/SettingsScreen';
import SettingsCard from '../settings/components/SettingsCard';
import DownloaderQueueCard from '../settings/downloaders/DownloaderQueueCard';
import { useLidarrRenderItem } from '../settings/downloaders/useLidarrRenderItem';
import { useSlskdRenderItem } from '../settings/downloaders/useSlskdRenderItem';
import { useDownloaderStates } from '@/features/downloaders/registry';
import type { LidarrQueueRecord } from '@/api/lidarr';
import type { SlskdQueueRecord } from '@/api/slskd';
import * as lidarr from '@/api/lidarr';
import * as slskd from '@/api/slskd';
import { useTheme } from '@/hooks/useTheme';
import { spacing, typography } from '@/constants/design';

/**
 * Top-level Downloads screen: one queue card per connected downloader, live.
 * Reachable from the Home "downloads in progress" banner (single tap, no more
 * branching between per-downloader settings pages) and from Settings root, so
 * the queues stop being buried under "Settings → Downloaders → Lidarr".
 *
 * The per-downloader auth + preferences still live on each downloader's
 * settings page; this screen is queue-only.
 */
const DownloadsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const states = useDownloaderStates();
  const connected = states.filter((s) => s.isConnected);

  const { renderItem: lidarrRenderItem } = useLidarrRenderItem();
  const slskdRenderItem = useSlskdRenderItem();

  return (
    <SettingsScreen title={t('downloads.title', 'Downloads')}>
      {connected.length === 0 && (
        <SettingsCard>
          <Text style={[styles.empty, { color: colors.subtext }]}>
            {t('downloads.noDownloaders', 'No downloaders connected. Add one in Settings.')}
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
        return null;
      })}
    </SettingsScreen>
  );
};

export default DownloadsScreen;

const styles = StyleSheet.create({
  empty: { ...typography.rowSubtitle, textAlign: 'center', marginVertical: spacing.lg },
});
