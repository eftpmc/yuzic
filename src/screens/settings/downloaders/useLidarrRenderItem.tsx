import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';

import type { LidarrQueueRecord } from '@/api/lidarr';
import { useTheme } from '@/hooks/useTheme';
import { useRadius } from '@/hooks/useRadius';
import SpinningLoaderCircle from '@/components/SpinningLoaderCircle';
import Touchable from '@/components/Touchable';
import { hitSlopFor, iconSize, statusColor } from '@/constants/design';
import { downloaderQueueStyles as styles, type RowCancelHelpers } from './DownloaderSettingsScreen';

/**
 * Shared renderItem for Lidarr queue rows. Lifted out of Lidarr.tsx so both
 * the settings queue and the top-level Downloads screen render each row
 * identically. Warning-expansion state lives inside the hook so each host
 * screen gets its own independent local state.
 */
export function useLidarrRenderItem() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const rad = useRadius();
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const renderItem = useCallback(
    (item: LidarrQueueRecord, cancel: RowCancelHelpers) => {
      const percent = Math.min(100, item.percentComplete ?? 0);
      const meta =
        item.trackCount > 0
          ? `${item.trackCount} ${t('settings.downloaders.tracks', { count: item.trackCount })}`
          : '';
      const hasWarnings = item.statusMessages?.length > 0;
      const isExpanded = expandedItemId === item.id;
      const title = item.albumTitle || t('settings.downloaders.unknownAlbum');

      return (
        <Pressable
          style={styles.itemRow}
          onPress={() => hasWarnings && setExpandedItemId(isExpanded ? null : item.id)}
        >
          <View style={styles.itemHeader}>
            <View style={styles.itemMain}>
              <Text style={[styles.itemTitle, { color: colors.secondary }]} numberOfLines={1}>
                {title}
              </Text>
              <Text style={[styles.itemSub, { color: colors.subtext }]} numberOfLines={1}>
                {[item.artistName, meta].filter(Boolean).join(' · ')}
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
    [colors, expandedItemId, rad.pill, t]
  );

  return { renderItem, resetExpanded: useCallback(() => setExpandedItemId(null), []) };
}
