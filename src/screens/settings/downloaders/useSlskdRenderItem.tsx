import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { SlskdQueueRecord } from '@/api/slskd';
import { formatBytes } from '@/utils/downloads/downloadStore';
import DownloaderQueueRow from './DownloaderQueueRow';
import type { RowCancelHelpers } from './DownloaderSettingsScreen';

export function useSlskdRenderItem() {
  const { t } = useTranslation();
  return useCallback((item: SlskdQueueRecord, cancel: RowCancelHelpers) => {
    const isCompleted = item.state.toLowerCase() === 'completed';
    const percent = Math.min(100, item.percentComplete ?? 0);
    const fileMeta = item.fileCount > 0 ? `${item.fileCount} ${t('settings.downloaders.files', { count: item.fileCount })}` : '';
    const sizeMeta = item.size > 0 ? formatBytes(item.size) : '';
    const speedMeta = !isCompleted && item.averageSpeed > 0 ? t('settings.downloaders.speed', { rate: formatBytes(item.averageSpeed) }) : '';
    const title = item.title || t('settings.downloaders.unknown');
    return <DownloaderQueueRow title={title} subtitle={[item.artistName || item.username, fileMeta, sizeMeta, speedMeta].filter(Boolean).join(' · ')} percent={percent} cancel={cancel} completed={isCompleted} />;
  }, [t]);
}
