import React from 'react';
import { render } from '@testing-library/react-native';

import AlbumOptions from './AlbumOptions';
import type { AlbumBase, ExternalAlbumBase } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS-only test mock, no typed ESM export
jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ colors: { secondary: '#000', subtext: '#666', border: '#ccc', muted: '#333', placeholder: '#999' }, isDarkMode: false }),
}));

jest.mock('@/hooks/useRadius', () => ({
  useRadius: () => ({ lg: 16, card: 8, thumb: 8, pill: 999, pillFor: (n: number) => n / 2 }),
}));

jest.mock('@/components/BottomSheetBackdrop', () => ({
  renderBackdrop: () => null,
}));

jest.mock('@/utils/useSheetRef', () => ({
  useSheetRef: () => ({ current: null }),
}));

jest.mock('@/utils/haptics', () => ({
  __esModule: true,
  default: { selection: jest.fn(), tap: jest.fn(), primary: jest.fn(), heavy: jest.fn(), success: jest.fn(), warning: jest.fn(), error: jest.fn() },
}));

jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() }),
}));

jest.mock('@/utils/share', () => ({
  shareItem: jest.fn(),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: any) => selector({}),
}));

jest.mock('@/utils/redux/selectors/statsSelectors', () => ({
  selectAlbumPlayCount: () => () => 0,
}));

jest.mock('@/api', () => ({
  useApi: () => ({ shares: undefined }),
}));

jest.mock('@/contexts/PlayingContext', () => ({
  usePlaying: () => ({
    playSongInCollection: jest.fn(),
    addCollectionToQueue: jest.fn(),
    shuffleCollectionToQueue: jest.fn(),
    getQueue: () => [],
    currentSong: null,
    playNext: jest.fn(),
  }),
}));

jest.mock('@/contexts/DownloadContext', () => ({
  useDownload: () => ({
    downloadAlbumById: jest.fn(),
    getCollectionDownloadState: () => ({ isDownloaded: false, isDownloading: false }),
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/features/sources/registry', () => ({
  useEnabledExternalSources: () => [],
}));

jest.mock('@/features/downloaders/registry', () => ({
  useAnyAlbumDownloaderConnected: jest.fn(() => false),
}));

jest.mock('./useLazyCollectionDetails', () => ({
  useLazyAlbumDetail: () => ({ albumWithSongs: null, songs: [], songsLoading: false }),
}));

jest.mock('@/hooks/starred', () => ({
  useStarredAlbums: () => ({ albums: [] }),
  useStarAlbum: () => ({ mutateAsync: jest.fn() }),
  useUnstarAlbum: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('@/hooks/useExternalAlbumStatus', () => ({
  useExternalAlbumStatus: jest.fn(() => ({ kind: 'none' })),
}));

jest.mock('@/components/options/DownloadSheet', () => 'DownloadSheet');

jest.mock('@/components/SpinningLoaderCircle', () => 'SpinningLoaderCircle');

jest.mock('@/components/options/OptionSheetPrimitives', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: RNText, View: RNView } = require('react-native');
  return {
    OptionSheetHeader: ({ title, subtitle }: any) => (
      <RNView>
        <RNText>{title}</RNText>
        {subtitle !== undefined && <RNText>{subtitle}</RNText>}
      </RNView>
    ),
    OptionSheetRow: ({ label }: any) => <RNText>{label}</RNText>,
    OptionSheetInfoRow: ({ label, value }: any) => <RNText>{label}: {value}</RNText>,
    OptionSheetChipsRow: ({ label }: any) => <RNText>{label}</RNText>,
    OptionSheetSectionLabel: ({ label }: any) => <RNText>{label}</RNText>,
    OptionSheetDivider: () => <RNView />,
    optionSheetStyles: { sheetBackground: {}, sheetContent: {}, loading: {} },
    useOptionSheetBackground: () => ({}),
  };
});

const { useAnyAlbumDownloaderConnected } = jest.requireMock('@/features/downloaders/registry') as {
  useAnyAlbumDownloaderConnected: jest.Mock;
};
const { useExternalAlbumStatus } = jest.requireMock('@/hooks/useExternalAlbumStatus') as {
  useExternalAlbumStatus: jest.Mock;
};

const libraryAlbum: AlbumBase = {
  id: 'a1',
  title: 'Local Album',
  cover: { kind: 'none' },
  subtext: 'Some Artist',
  artist: { id: 'ar1', name: 'Some Artist', subtext: '', cover: { kind: 'none' } },
  year: 2020,
  genres: [],
  created: new Date(0),
};

const externalAlbum: ExternalAlbumBase = {
  id: 'ext1',
  title: 'External Album',
  cover: { kind: 'none' },
  artist: 'External Artist',
  subtext: 'External Artist',
};

describe('AlbumOptions', () => {
  beforeEach(() => {
    useAnyAlbumDownloaderConnected.mockReset().mockReturnValue(false);
    useExternalAlbumStatus.mockReset().mockReturnValue({ kind: 'none' });
  });

  it('renders the library action set for a library album', async () => {
    const view = await render(<AlbumOptions ref={null as any} album={libraryAlbum} />);
    // Library-only actions.
    expect(view.getByText('albumOptions.actions.play')).toBeTruthy();
    expect(view.getByText('albumOptions.actions.shuffle')).toBeTruthy();
    expect(view.getByText('albumOptions.actions.goToAlbum')).toBeTruthy();
    // External-only action must not appear.
    expect(view.queryByText('externalAlbum.menu.noServiceConnected')).toBeNull();
    expect(view.queryByText('externalAlbum.menu.downloadToServer')).toBeNull();
  });

  it('renders the external action set for an external album (no downloader connected)', async () => {
    const view = await render(<AlbumOptions ref={null as any} album={externalAlbum} />);
    expect(view.getByText('externalAlbum.menu.noServiceConnected')).toBeTruthy();
    // Library-only actions must not appear.
    expect(view.queryByText('albumOptions.actions.play')).toBeNull();
    expect(view.queryByText('albumOptions.actions.goToAlbum')).toBeNull();
  });

  it('shows the download-to-server action for an external album with a connected downloader', async () => {
    useAnyAlbumDownloaderConnected.mockReturnValue(true);
    const view = await render(<AlbumOptions ref={null as any} album={externalAlbum} />);
    expect(view.getByText('externalAlbum.menu.downloadToServer')).toBeTruthy();
  });
});
