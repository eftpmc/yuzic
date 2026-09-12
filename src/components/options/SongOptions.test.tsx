import React from 'react';
import { render } from '@testing-library/react-native';

import SongOptions from './SongOptions';
import type { ExternalSong, Song } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS-only test mock, no typed ESM export
jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ colors: { secondary: '#000', subtext: '#666', border: '#ccc', favorite: '#f00', placeholder: '#999' }, isDarkMode: false }),
}));

jest.mock('@/hooks/useRadius', () => ({
  useRadius: () => ({ lg: 16, card: 8 }),
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

jest.mock('react-redux', () => ({
  useSelector: (selector: any) => selector({}),
}));

jest.mock('@/utils/redux/selectors/statsSelectors', () => ({
  selectSongPlayCount: () => () => 0,
}));

jest.mock('@/utils/redux/selectors/audiomuseSelectors', () => ({
  selectIsAudiomuseConfigured: () => false,
  selectAudiomuseConfig: () => ({}),
}));

const mockGenerateSimilarPlaylist = jest.fn();
jest.mock('@/features/audiomuse/generatePlaylist', () => ({
  generateSimilarPlaylist: (...args: unknown[]) => mockGenerateSimilarPlaylist(...args),
}));

jest.mock('@/api', () => ({
  useApi: () => ({}),
}));

jest.mock('@/contexts/PlayingContext', () => ({
  usePlayingState: () => ({ currentSong: null }),
  usePlayingActions: () => ({ addToQueue: jest.fn(), playNext: jest.fn(), playSimilar: jest.fn() }),
}));

jest.mock('@/hooks/useIsOffline', () => ({
  useIsOffline: () => false,
}));

jest.mock('@/contexts/DownloadContext', () => ({
  useDownload: () => ({
    downloadTrack: jest.fn(),
    deleteDownloadedTrack: jest.fn(),
    isTrackDownloaded: () => false,
    isTrackDownloading: () => false,
  }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/starred', () => ({
  useStarredSongs: () => ({ songs: [] }),
  useStarSong: () => ({ mutateAsync: jest.fn() }),
  useUnstarSong: () => ({ mutateAsync: jest.fn() }),
}));

jest.mock('@/features/downloaders/registry', () => ({
  useAnyDownloaderConnected: jest.fn(() => false),
  useAnyTrackDownloaderConnected: jest.fn(() => false),
}));

jest.mock('@/components/options/DownloadSheet', () => 'DownloadSheet');

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

const { useAnyDownloaderConnected, useAnyTrackDownloaderConnected } = jest.requireMock(
  '@/features/downloaders/registry'
) as {
  useAnyDownloaderConnected: jest.Mock;
  useAnyTrackDownloaderConnected: jest.Mock;
};

const librarySong: Song = {
  id: 's1',
  title: 'Local Song',
  artist: 'Some Artist',
  artistId: 'ar1',
  cover: { kind: 'none' },
  duration: '180',
  albumId: 'al1',
  streamUrl: 'https://example.com/stream',
};

const externalSong: ExternalSong = {
  id: 'ext-s1',
  title: 'External Song',
  artist: 'External Artist',
  cover: { kind: 'none' },
  duration: '180',
  albumId: 'ext-al1',
};

describe('SongOptions', () => {
  beforeEach(() => {
    useAnyDownloaderConnected.mockReset().mockReturnValue(false);
    useAnyTrackDownloaderConnected.mockReset().mockReturnValue(false);
    mockGenerateSimilarPlaylist.mockReset();
  });

  it('renders the library action set for a library song, including instant mix', async () => {
    const view = await render(
      <SongOptions ref={null as any} selectedSong={librarySong} onAddToPlaylist={jest.fn()} />
    );
    expect(view.getByText('songOptions.actions.addToPlaylist')).toBeTruthy();
    expect(view.getByText('songOptions.actions.instantMix')).toBeTruthy();
    // External-only actions must not appear.
    expect(view.queryByText('externalAlbum.menu.downloadToServer')).toBeNull();
    expect(view.queryByText('externalAlbum.menu.downloadSong')).toBeNull();
  });

  it('renders the external action set for an external song (no downloader connected)', async () => {
    const view = await render(
      <SongOptions
        ref={null as any}
        selectedSong={externalSong}
        albumTitle="External Album"
        albumArtist="External Artist"
      />
    );
    expect(view.getByText('External Song')).toBeTruthy();
    // Library-only actions must not appear.
    expect(view.queryByText('songOptions.actions.addToPlaylist')).toBeNull();
    expect(view.queryByText('songOptions.actions.instantMix')).toBeNull();
    expect(view.queryByText('externalAlbum.menu.downloadToServer')).toBeNull();
  });

  it('shows the download actions for an external song with connected downloaders', async () => {
    useAnyDownloaderConnected.mockReturnValue(true);
    useAnyTrackDownloaderConnected.mockReturnValue(true);
    const view = await render(
      <SongOptions
        ref={null as any}
        selectedSong={externalSong}
        albumTitle="External Album"
        albumArtist="External Artist"
      />
    );
    expect(view.getByText('externalAlbum.menu.downloadToServer')).toBeTruthy();
    expect(view.getByText('externalAlbum.menu.downloadSong')).toBeTruthy();
  });
});
