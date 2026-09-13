import React from 'react';
import * as soulsync from '@/api/soulsync';
import DownloaderSettingsScreen from './DownloaderSettingsScreen';

const SoulSyncView: React.FC = () => {
  return (
    <DownloaderSettingsScreen
      id="soulsync"
      testConnection={soulsync.testConnection}
    />
  );
};

export default SoulSyncView;
