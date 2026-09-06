import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CheckCircle, X } from 'lucide-react-native';

import type { SlskdQueueRecord } from '@/api/slskd';
import { hitSlopFor, iconSize, statusColor } from '@/constants/design';
import { useTheme } from '@/hooks/useTheme';
import { useRadius } from '@/hooks/useRadius';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { formatBytes } from '@/utils/downloads/downloadStore';
import { downloaderQueueStyles as styles, type RowCancelHelpers } from './DownloaderSettingsScreen';

/**
 * Shared renderItem for slskd queue rows. Lifted out of Slskd.tsx so both
 * the settings queue and the top-level Downloads screen render each row
 * identically.
 */
export function useSlskdRenderItem() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();

  return useCallback(
    (item: SlskdQueueRecord, cancel: RowCancelHelpers) => {
      const isCompleted = item.state.toLowerCase() === 'completed';
      const percent = Math.min(100, item.percentComplete ?? 0);
      const fileMeta =
        item.fileCount > 0
          ? `${item.fileCount} ${t('settings.downloaders.files', { count: item.fileCount })}`
          : '';
      const sizeMeta = item.size > 0 ? formatBytes(item.size) : '';
      const speedMeta =
        !isCompleted && item.averageSpeed > 0
          ? t('settings.downloaders.speed', { rate: formatBytes(item.averageSpeed) })
          : '';
      const subLine = [item.artistName || item.username, fileMeta, sizeMeta, speedMeta]
        .filter(Boolean)
        .join(' · ');
      const title = item.title || t('settings.downloaders.unknown');

      return (
        <View style={styles.itemRow}>
          <View style={styles.itemHeader}>
            <View style={styles.itemMain}>
              <Text style={[styles.itemTitle, { color: colors.secondary }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[styles.itemSub, { color: colors.subtext }]} numberOfLines={1}>
                {subLine}
              </Text>
            </View>
            <View style={styles.headerTrailing}>
              {isCompleted ? (
                <CheckCircle size={iconSize.inline} color={statusColor.success} />
              ) : (
                <Text style={[styles.itemPct, { color: colors.subtext }]}>{percent}%</Text>
              )}
              {cancel.requestCancel && (
                cancel.isCancelling ? (
                  <View style={styles.cancelButton}>
                    <SpinningLoaderCircle size={iconSize.row} color={colors.subtext} />
                  </View>
                ) : (
                  <Touchable
                    feedback="control"
                    style={styles.cancelButton}
                    hitSlop={hitSlopFor(24)}
                    onPress={() => cancel.requestCancel!(title)}
                    accessibilityRole="button"
                    accessibilityLabel={t('settings.downloaders.cancelAria', { title })}
                  >
                    <X size={iconSize.row} color={statusColor.destructive} />
                  </Touchable>
                )
              )}
            </View>
          </View>
          {!isCompleted && (
            <View style={[styles.progressTrack, { backgroundColor: colors.border, borderRadius: rad.pill }]}>
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
    [colors, rad.pill, t]
  );
}
