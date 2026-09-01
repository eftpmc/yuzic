import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import * as lidarr from '@/api/lidarr';
import type { LidarrQueueRecord } from '@/api/lidarr';
import { useTheme } from '@/hooks/useTheme';
import DownloaderSettingsScreen, {
  downloaderQueueStyles as styles,
} from './DownloaderSettingsScreen';

const LidarrView: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const renderItem = useCallback(
    (item: LidarrQueueRecord) => {
      const percent = Math.min(100, item.percentComplete ?? 0);
      const meta =
        item.trackCount > 0
          ? `${item.trackCount} ${t('settings.downloaders.tracks', { count: item.trackCount })}`
          : '';
      const hasWarnings = item.statusMessages?.length > 0;
      const isExpanded = expandedItemId === item.id;

      return (
        <Pressable
          style={styles.itemRow}
          onPress={() => hasWarnings && setExpandedItemId(isExpanded ? null : item.id)}
        >
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
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.themeColor, width: `${percent}%` },
              ]}
            />
          </View>
          {hasWarnings && isExpanded && (
            <View style={[styles.warningContainer, { backgroundColor: colors.muted }]}>
              {item.statusMessages.map((msg, idx) => (
                <Text key={idx} style={[styles.warningMessage, { color: colors.subtext }]}>
                  • {msg.title}
                </Text>
              ))}
            </View>
          )}
        </Pressable>
      );
    },
    [colors, expandedItemId, t]
  );

  return (
    <DownloaderSettingsScreen<LidarrQueueRecord>
      id="lidarr"
      testConnection={lidarr.testConnection}
      fetchQueueWithDiff={lidarr.fetchQueueWithDiff}
      renderItem={renderItem}
      onDisconnected={() => setExpandedItemId(null)}
    />
  );
};

export default LidarrView;
