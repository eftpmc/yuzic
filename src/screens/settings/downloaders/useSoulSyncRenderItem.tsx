import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';

import type { SoulSyncQueueRecord } from '@/api/soulsync';
import { useTheme } from '@/hooks/useTheme';
import { useRadius } from '@/hooks/useRadius';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { hitSlopFor, iconSize, statusColor } from '@/constants/design';
import { downloaderQueueStyles as styles, type RowCancelHelpers } from './DownloaderSettingsScreen';

/**
 * A SoulSync queue row. One track per row — SoulSync's queue is track-shaped
 * all the way down, so unlike Lidarr's there is no album to collapse into and
 * no per-row warning list to expand.
 */
export function useSoulSyncRenderItem() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();

  return useCallback(
    (item: SoulSyncQueueRecord, cancel: RowCancelHelpers) => {
      const percent = Math.max(0, Math.min(100, Math.round(item.progress)));
      const title = item.title || t('settings.downloaders.unknown');
      const subtitle = [item.artist, item.album].filter(Boolean).join(' · ');

      return (
        <View style={styles.itemRow}>
          <View style={styles.itemHeader}>
            <View style={styles.itemMain}>
              <Text style={[styles.itemTitle, { color: colors.secondary }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[styles.itemSub, { color: colors.subtext }]} numberOfLines={1}>
                {subtitle || item.status}
              </Text>
            </View>
            <View style={styles.headerTrailing}>
              <Text style={[styles.itemPct, { color: colors.subtext }]}>{percent}%</Text>
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
          <View style={[styles.progressTrack, { backgroundColor: colors.border, borderRadius: rad.pill }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: colors.themeColor, width: `${percent}%` },
              ]}
            />
          </View>
        </View>
      );
    },
    [colors, rad.pill, t]
  );
}
