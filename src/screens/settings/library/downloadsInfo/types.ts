import { DownloadProviderType } from '@/utils/downloads/provider';
import { CoverSource } from '@/types';

export type DownloadRow = {
  id: string;
  collectionId: string;
  type: 'album' | 'playlist';
  provider: DownloadProviderType;
  serverId: string | null;
  cover: CoverSource;
  title: string;
  subtitle: string;
  trackIds: string[];
  downloaded: string;
  size: string;
  trackCount: number;
  updatedAt: number;
};
