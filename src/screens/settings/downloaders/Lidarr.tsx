import React from 'react';
import * as lidarr from '@/api/lidarr';
import type { LidarrQueueRecord } from '@/api/lidarr';
import DownloaderSettingsScreen from './DownloaderSettingsScreen';
import { useLidarrRenderItem } from './useLidarrRenderItem';

const LidarrView: React.FC = () => {
  const { renderItem, resetExpanded } = useLidarrRenderItem();

  return (
    <DownloaderSettingsScreen<LidarrQueueRecord>
      id="lidarr"
      testConnection={lidarr.testConnection}
      fetchQueueWithDiff={lidarr.fetchQueueWithDiff}
      cancelQueueItem={lidarr.cancelQueueItem}
      renderItem={renderItem}
      onDisconnected={resetExpanded}
    />
  );
};

export default LidarrView;
