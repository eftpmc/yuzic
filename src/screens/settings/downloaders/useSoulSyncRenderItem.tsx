import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { SoulSyncQueueRecord } from '@/api/soulsync';
import DownloaderQueueRow from './DownloaderQueueRow';
import type { RowCancelHelpers } from './DownloaderSettingsScreen';

export function useSoulSyncRenderItem() {
  const { t } = useTranslation();
  return useCallback((item: SoulSyncQueueRecord, cancel: RowCancelHelpers) => {
    const percent = Math.max(0, Math.min(100, Math.round(item.progress)));
    const title = item.title || t('settings.downloaders.unknown');
    return <DownloaderQueueRow title={title} subtitle={[item.artist, item.album].filter(Boolean).join(' · ') || item.status} percent={percent} cancel={cancel} />;
  }, [t]);
}
