import { DownloadProviderType } from '@/utils/downloads/provider';

export type DownloadRow = {
  id: string;
  collectionId: string;
  type: 'album' | 'playlist';
  provider: DownloadProviderType;
  serverId: string | null;
  cover: any;
  title: string;
  subtitle: string;
  trackIds: string[];
  downloaded: string;
  size: string;
  updatedAt: number;
};

