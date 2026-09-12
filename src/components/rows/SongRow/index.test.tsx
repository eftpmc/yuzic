import React from 'react';
import { render } from '@testing-library/react-native';

import SongRow, { isExternalSong } from './index';
import type { ExternalSong, Song } from '@/types';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ colors: { secondary: '#000', subtext: '#666', favorite: '#f00' } }),
}));

jest.mock('@/hooks/useListDensity', () => ({
  useListDensity: () => ({ rowPadding: 8, trackRowPadding: 8 }),
}));

jest.mock('@/contexts/PlayingContext', () => ({
  usePlayingActions: () => ({ playSongInCollection: jest.fn() }),
}));

jest.mock('@/contexts/SongActionSheetContext', () => ({
  useSongActionSheets: () => ({ openSongOptions: jest.fn() }),
}));

jest.mock('@/contexts/DownloadContext', () => ({
  useDownloadState: () => ({ isTrackDownloaded: () => false }),
}));

jest.mock('@/features/home/hooks/useDeezerEnabled', () => ({
  useDeezerDiscoveryEnabled: () => false,
}));

jest.mock('@/components/options/SongOptions', () => 'SongOptions');

jest.mock('@/utils/useSheetRef', () => ({
  useSheetRef: () => ({ current: null }),
}));

jest.mock('@backpackapp-io/react-native-toast', () => ({
  toast: Object.assign(jest.fn(), { error: jest.fn() }),
}));

jest.mock('@/components/MediaListRow', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: RNText, View: RNView } = require('react-native');
  function MockMediaListRow({ title }: any) {
    return (
      <RNView>
        <RNText>{title}</RNText>
      </RNView>
    );
  }
  return MockMediaListRow;
});

// SongRow animates its favorite heart via react-native-reanimated; the
// module's own jest mock is ESM and isn't covered by the project's
// transformIgnorePatterns, so a minimal inline stub is used instead.
jest.mock('react-native-reanimated', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const RN = require('react-native');
  return {
    __esModule: true,
    default: { View: RN.View, Text: RN.Text },
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withTiming: (v: unknown) => v,
  };
});

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

describe('SongRow', () => {
  it('detects external-origin songs via the missing streamUrl field', () => {
    expect(isExternalSong(librarySong)).toBe(false);
    expect(isExternalSong(externalSong)).toBe(true);
  });

  it('renders a plain library song row', async () => {
    const view = await render(<SongRow song={librarySong} />);
    expect(view.getByText('Local Song')).toBeTruthy();
  });

  it('renders an external song row via the shared component', async () => {
    const view = await render(
      <SongRow
        song={externalSong}
        albumTitle="External Album"
        albumArtist="External Artist"
      />
    );
    expect(view.getByText('External Song')).toBeTruthy();
  });
});
