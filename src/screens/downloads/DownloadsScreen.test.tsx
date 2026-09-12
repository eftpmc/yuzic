import React from 'react';
import { render } from '@testing-library/react-native';

import DownloadsScreen from './DownloadsScreen';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: any) => (opts?.title ?? opts?.provider ?? key) }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: any) => selector({}),
}));

jest.mock('@/hooks/useScrollClearance', () => ({
  useScrollClearance: () => 0,
}));

jest.mock('@/hooks/useRadius', () => ({
  useRadius: () => ({ lg: 16, card: 8, thumb: 8, pill: 999, md: 8, pillFor: (n: number) => n / 2 }),
}));

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ colors: { secondary: '#000', subtext: '#666', border: '#ccc', card: '#111', themeColor: '#0f0', background: '#fff', muted: '#eee' } }),
}));

jest.mock('./OfflineSection', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory can't reference outer-scope imports
  const { Text: RNText } = require('react-native');
  return {
    __esModule: true,
    default: () => <RNText testID="offline-section-mock">offline</RNText>,
  };
});

const mockUseDownloadersQueue = jest.fn(() => ({ queues: [], totalInFlight: 0 }));
jest.mock('@/features/downloaders/DownloadersQueueContext', () => ({
  useDownloadersQueue: () => mockUseDownloadersQueue(),
}));

const mockUseDownloaderStates = jest.fn();
jest.mock('@/features/downloaders/registry', () => ({
  useDownloaderStates: () => mockUseDownloaderStates(),
}));

jest.mock('../settings/downloaders/useLidarrRenderItem', () => ({
  useLidarrRenderItem: () => ({ renderItem: () => null, resetExpanded: jest.fn() }),
}));
jest.mock('../settings/downloaders/useSlskdRenderItem', () => ({
  useSlskdRenderItem: () => () => null,
}));
jest.mock('../settings/downloaders/useSoulSyncRenderItem', () => ({
  useSoulSyncRenderItem: () => () => null,
}));

jest.mock('../settings/downloaders/DownloaderQueueCard', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory can't reference outer-scope imports
  const { Text: RNText } = require('react-native');
  return {
    __esModule: true,
    default: ({ id, title }: { id: string; title?: string }) => (
      <RNText testID={`downloader-queue-card-${id}`}>{title}</RNText>
    ),
  };
});

jest.mock('@/api/lidarr', () => ({ fetchQueueWithDiff: jest.fn(), cancelQueueItem: jest.fn() }));
jest.mock('@/api/slskd', () => ({ fetchQueueWithDiff: jest.fn(), cancelQueueItem: jest.fn() }));
jest.mock('@/api/soulsync', () => ({ fetchQueueWithDiff: jest.fn(), cancelDownload: jest.fn() }));

function connectedState(id: 'lidarr' | 'slskd' | 'soulsync', label: string) {
  return {
    def: { id, label },
    config: { serverUrl: `http://${id}`, apiKey: 'key' },
    isConnected: true,
  };
}

describe('DownloadsScreen', () => {
  beforeEach(() => {
    mockUseDownloadersQueue.mockClear();
  });

  it('renders the Offline section and the Downloaders section', async () => {
    mockUseDownloaderStates.mockReturnValue([]);
    const view = await render(<DownloadsScreen />);

    expect(view.getByTestId('offline-section-mock')).toBeTruthy();
    expect(view.getByText('downloads.section.offline')).toBeTruthy();
    expect(view.getByText('downloads.section.downloaders')).toBeTruthy();
  });

  it('shows every connected downloader, including SoulSync (previously omitted)', async () => {
    mockUseDownloaderStates.mockReturnValue([
      connectedState('lidarr', 'Lidarr'),
      connectedState('slskd', 'Soulseek'),
      connectedState('soulsync', 'SoulSync'),
    ]);

    const view = await render(<DownloadsScreen />);

    expect(view.getByTestId('downloader-queue-card-lidarr')).toBeTruthy();
    expect(view.getByTestId('downloader-queue-card-slskd')).toBeTruthy();
    expect(view.getByTestId('downloader-queue-card-soulsync')).toBeTruthy();
  });

  it('reads the shared useDownloadersQueue() context rather than spinning up its own poll', async () => {
    mockUseDownloaderStates.mockReturnValue([connectedState('lidarr', 'Lidarr')]);
    await render(<DownloadsScreen />);

    expect(mockUseDownloadersQueue).toHaveBeenCalled();
  });

  it('shows the empty state when nothing is connected', async () => {
    mockUseDownloaderStates.mockReturnValue([]);
    const view = await render(<DownloadsScreen />);

    expect(view.getByText('downloads.noDownloaders')).toBeTruthy();
  });
});
