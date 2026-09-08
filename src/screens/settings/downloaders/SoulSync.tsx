import React from 'react';
import * as soulsync from '@/api/soulsync';
import type { SoulSyncQueueRecord } from '@/api/soulsync';
import DownloaderSettingsScreen from './DownloaderSettingsScreen';
import { useSoulSyncRenderItem } from './useSoulSyncRenderItem';

const SoulSyncView: React.FC = () => {
  const renderItem = useSoulSyncRenderItem();

  return (
    <DownloaderSettingsScreen<SoulSyncQueueRecord>
      id="soulsync"
      testConnection={soulsync.testConnection}
      fetchQueueWithDiff={soulsync.fetchQueueWithDiff}
      cancelQueueItem={(config, item) => soulsync.cancelDownload(config, item)}
      renderItem={renderItem}
    />
  );
};

export default SoulSyncView;
