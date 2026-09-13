import React from 'react';
import { render } from '@testing-library/react-native';

import ArtistOptions from './ArtistOptions';
import type { Artist } from '@/types';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS-only test mock, no typed ESM export
jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ colors: { secondary: '#000', subtext: '#666', border: '#ccc' }, isDarkMode: false }),
}));

jest.mock('@/components/BottomSheetBackdrop', () => ({
  renderBackdrop: () => null,
}));

jest.mock('@/components/toast', () => ({
  notify: Object.assign(jest.fn(), { info: jest.fn(), success: jest.fn(), error: jest.fn(), loading: jest.fn(), dismiss: jest.fn() }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: any) => selector({}),
}));

jest.mock('@/utils/redux/selectors/statsSelectors', () => ({
  selectArtistPlayCount: () => () => 0,
}));

jest.mock('@/utils/redux/selectors/audiomuseSelectors', () => ({
  selectAudiomuseConfig: () => ({}),
}));

const mockCanGeneratePlaylist = jest.fn(() => false);
const mockGenerateForArtist = jest.fn();
jest.mock('@/features/audiomuse/generateFromEntity', () => ({
  useCanGeneratePlaylist: () => mockCanGeneratePlaylist(),
  generateForArtist: (...args: unknown[]) => mockGenerateForArtist(...args),
}));

jest.mock('@/api', () => ({
  useApi: () => ({}),
}));

jest.mock('@/contexts/PlayingContext', () => ({
  usePlayingActions: () => ({
    addCollectionToQueue: jest.fn(),
    shuffleCollectionToQueue: jest.fn(),
    getQueue: () => [],
    playSongInCollection: jest.fn(),
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

jest.mock('@/hooks/artists', () => ({
  useArtistAlbums: () => [],
}));

jest.mock('./useLazyCollectionDetails', () => ({
  useLazyArtistSongs: () => ({ songs: [], songsLoading: false }),
}));

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
    OptionSheetRow: ({ label, onPress }: any) => <RNText onPress={onPress}>{label}</RNText>,
    OptionSheetInfoRow: ({ label, value }: any) => <RNText>{label}: {value}</RNText>,
    OptionSheetSectionLabel: ({ label }: any) => <RNText>{label}</RNText>,
    OptionSheetDivider: () => <RNView />,
    optionSheetStyles: { sheetBackground: {}, sheetContent: {}, loading: {} },
    useOptionSheetBackground: () => ({}),
  };
});

const artist: Artist = {
  id: 'ar1',
  cover: { kind: 'none' },
  name: 'Some Artist',
  subtext: '',
  albumIds: [],
};

describe('ArtistOptions', () => {
  beforeEach(() => {
    mockCanGeneratePlaylist.mockReset().mockReturnValue(false);
    mockGenerateForArtist.mockReset();
  });

  it('renders the base artist action set', async () => {
    const view = await render(<ArtistOptions ref={null as any} artist={artist} />);
    expect(view.getByText('artistOptions.actions.play')).toBeTruthy();
    expect(view.getByText('artistOptions.actions.shuffle')).toBeTruthy();
  });

  it('hides "Make a playlist from this" when the playlist.generate slot is unfilled', async () => {
    mockCanGeneratePlaylist.mockReturnValue(false);
    const view = await render(<ArtistOptions ref={null as any} artist={artist} />);
    expect(view.queryByText('artistOptions.actions.generatePlaylist')).toBeNull();
  });

  it('shows "Make a playlist from this" when the slot is filled', async () => {
    mockCanGeneratePlaylist.mockReturnValue(true);
    const view = await render(<ArtistOptions ref={null as any} artist={artist} />);
    expect(view.getByText('artistOptions.actions.generatePlaylist')).toBeTruthy();
  });
});
