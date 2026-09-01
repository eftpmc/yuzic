import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle } from 'lucide-react-native';

import * as slskd from '@/api/slskd';
import type { SlskdQueueRecord } from '@/api/slskd';
import { statusColor } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';
import DownloaderSettingsScreen, {
  downloaderQueueStyles as styles,
} from './DownloaderSettingsScreen';

const SlskdView: React.FC = () => {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const renderItem = useCallback(
    (item: SlskdQueueRecord) => {
      const isCompleted = item.state.toLowerCase() === 'completed';
      const percent = Math.min(100, item.percentComplete ?? 0);
      const meta =
        item.fileCount > 0
          ? `${item.fileCount} ${t('settings.downloaders.files', { count: item.fileCount })}`
          : '';

      return (
        <View style={styles.itemRow}>
          <View style={styles.itemHeader}>
            <View style={styles.itemMain}>
              <Text style={[styles.itemTitle, { color: colors.secondary }]} numberOfLines={1}>
                {item.title || t('settings.downloaders.unknown')}
              </Text>
              <Text style={[styles.itemSub, { color: colors.subtext }]} numberOfLines={1}>
                {[item.artistName || item.username, meta].filter(Boolean).join(' · ')}
              </Text>
            </View>
            {isCompleted ? (
              <CheckCircle size={16} color={statusColor.success} />
            ) : (
              <Text style={[styles.itemPct, { color: colors.subtext }]}>{percent}%</Text>
            )}
          </View>
          {!isCompleted && (
            <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: colors.themeColor, width: `${percent}%` },
                ]}
              />
            </View>
          )}
        </View>
      );
    },
    [colors, t]
  );

  return (
    <DownloaderSettingsScreen<SlskdQueueRecord>
      id="slskd"
      testConnection={slskd.testConnection}
      fetchQueueWithDiff={slskd.fetchQueueWithDiff}
      renderItem={renderItem}
    />
  );
};

export default SlskdView;
