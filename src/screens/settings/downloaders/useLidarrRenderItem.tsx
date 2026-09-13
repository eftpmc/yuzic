import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LidarrQueueRecord } from '@/api/lidarr';
import DownloaderQueueRow from './DownloaderQueueRow';
import type { RowCancelHelpers } from './DownloaderSettingsScreen';

export function useLidarrRenderItem() {
  const { t } = useTranslation();
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const renderItem = useCallback((item: LidarrQueueRecord, cancel: RowCancelHelpers) => {
    const percent = Math.min(100, item.percentComplete ?? 0);
    const meta = item.trackCount > 0 ? `${item.trackCount} ${t('settings.downloaders.tracks', { count: item.trackCount })}` : '';
    const hasWarnings = item.statusMessages?.length > 0;
    const isExpanded = expandedItemId === item.id;
    const title = item.albumTitle || t('settings.downloaders.unknownAlbum');
    return <DownloaderQueueRow title={title} subtitle={[item.artistName, meta].filter(Boolean).join(' · ')} percent={percent} cancel={cancel} onPress={() => hasWarnings && setExpandedItemId(isExpanded ? null : item.id)} warningMessages={hasWarnings && isExpanded ? item.statusMessages : undefined} />;
  }, [expandedItemId, t]);
  return { renderItem, resetExpanded: useCallback(() => setExpandedItemId(null), []) };
}
