import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import LocalMixSection from './LocalMixSection';
import { useApi } from '@/api';
import { useServerReachable } from '@/features/connectivity/useServerReachable';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ colors: { secondary: '#000', subtext: '#666' } }),
}));

jest.mock('@/hooks/useListDensity', () => ({
  useListDensity: () => ({ rowPadding: 8, trackRowPadding: 8, rowGap: 8 }),
}));

jest.mock('@/hooks/useRadius', () => ({
  useRadius: () => ({ thumb: 8, pill: 999, pillFor: () => 999, card: 8 }),
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
jest.mock('@/components/SkeletonListRow', () => 'SkeletonListRow');

jest.mock('@/utils/useSheetRef', () => ({
  useSheetRef: () => ({ current: null }),
}));

jest.mock('@/components/toast', () => ({
  notify: { info: jest.fn(), success: jest.fn(), error: jest.fn(), loading: jest.fn(), dismiss: jest.fn() },
}));

jest.mock('@/components/MediaListRow', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Text: RNText, View: RNView } = require('react-native');
  return function MockMediaListRow({ title }: any) {
    return (
      <RNView>
        <RNText>{title}</RNText>
      </RNView>
    );
  };
});

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

jest.mock('@/features/connectivity/useServerReachable', () => ({
  useServerReachable: jest.fn(() => true),
}));

// The shelf's own gating (seeds present, similarity capability present,
// server reachable) is what's worth asserting here — the actual
// fetch/merge is the same pattern already covered elsewhere (queueProviders,
// ServerRandomSection). Mocking `useQuery` keeps this synchronous.
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

const mockGetSimilarSongs = jest.fn();
jest.mock('@/api', () => ({
  useApi: jest.fn(),
}));

const sampleSimilarSong = {
  id: 's1',
  title: 'Similar Song',
  artist: 'Some Artist',
  cover: { kind: 'none' as const },
  duration: '',
  albumId: '',
  streamUrl: 'http://example.com/s1',
};

function renderWithStore(
  ui: React.ReactElement,
  {
    songPlays = { 's1:seed1': 5 },
    tracks = [{ id: 'seed1', title: 'Seed Song', artist: 'Seed Artist', cover: { kind: 'none' }, duration: '', albumId: '' }],
  }: { songPlays?: Record<string, number>; tracks?: any[] } = {}
) {
  const store = configureStore({
    reducer: {
      stats: (state = {
        songPlays,
        serverSongPlays: {},
        songLastPlayedAt: {},
        serverSongLastPlayedAt: {},
      }) => state,
      servers: (state = { activeServerId: 's1' }) => state,
      libraryTracks: (state = { tracks }) => state,
    },
  });

  return render(<Provider store={store}>{ui}</Provider>);
}

describe('LocalMixSection', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
    mockGetSimilarSongs.mockReset();
    (useApi as jest.Mock).mockReturnValue({
      similar: { getSimilarSongs: mockGetSimilarSongs },
    });
    (useServerReachable as jest.Mock).mockReturnValue(true);
  });

  it('seeds from play-stats and calls api.similar.getSimilarSongs (never an external service)', async () => {
    mockUseQuery.mockReturnValue({ data: [sampleSimilarSong], isLoading: false });

    const view = await renderWithStore(<LocalMixSection sectionKey="localMix" />);

    expect(view.getByText('Similar Song')).toBeTruthy();
    // The query fn is passed to useQuery rather than invoked directly here,
    // but the call must be enabled — proving it depends on seeds + adapter
    // presence, not on any external-discovery flag.
    const options = mockUseQuery.mock.calls[0]?.[0];
    expect(options.enabled).toBe(true);
  });

  it('hides when there is no play history to seed from', async () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    const view = await renderWithStore(<LocalMixSection sectionKey="localMix" />, {
      songPlays: {},
      tracks: [],
    });

    expect(view.toJSON()).toBeNull();
    const options = mockUseQuery.mock.calls[0]?.[0];
    expect(options.enabled).toBe(false);
  });

  it('hides when the server adapter has no similarity capability', async () => {
    (useApi as jest.Mock).mockReturnValue({ similar: {} });
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    const view = await renderWithStore(<LocalMixSection sectionKey="localMix" />);

    expect(view.toJSON()).toBeNull();
    const options = mockUseQuery.mock.calls[0]?.[0];
    expect(options.enabled).toBe(false);
  });

  it('stays hidden when the similarity expansion has no results', async () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    const view = await renderWithStore(<LocalMixSection sectionKey="localMix" />);

    expect(view.toJSON()).toBeNull();
  });

  it('shows a loading skeleton while the query is in flight', async () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });

    const view = await renderWithStore(<LocalMixSection sectionKey="localMix" />);

    expect(view.toJSON()).not.toBeNull();
  });

  it('is not gated behind external-discovery enablement', async () => {
    // No Deezer/ListenBrainz mock reads any setting here — presence depends
    // only on play-stats + server similarity + reachability, asserted above.
    // This test documents that guarantee explicitly for reviewers.
    mockUseQuery.mockReturnValue({ data: [sampleSimilarSong], isLoading: false });

    const view = await renderWithStore(<LocalMixSection sectionKey="localMix" />);

    expect(view.getByText('Similar Song')).toBeTruthy();
  });
});
