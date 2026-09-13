import React from 'react';
import { render } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import LBCreatedForSection from './LBCreatedForSection';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
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

// The shelf's own enablement gate (discovery setting + username) is what's
// worth asserting here; the actual fetch+filter is getCreatedForPlaylists's
// own well-tested surface. Mocking `useQuery` keeps this test synchronous
// and avoids standing up a real QueryClient's background timers, which
// otherwise outlive the test and hang the runner waiting for them to settle.
const mockUseQuery = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

jest.mock('@/api/listenbrainz', () => ({
  getCreatedForPlaylists: jest.fn(),
}));

function renderWithStore(
  ui: React.ReactElement,
  { discoveryEnabled = true, username = 'listener' }: { discoveryEnabled?: boolean; username?: string | null } = {}
) {
  const store = configureStore({
    reducer: {
      settings: (state = { listenbrainzDiscoveryEnabled: discoveryEnabled }) => state,
      listenbrainz: (state = { byServer: { s1: { username, token: 't' } } }) => state,
      servers: (state = { activeServerId: 's1' }) => state,
    },
  });

  return render(<Provider store={store}>{ui}</Provider>);
}

const sampleTrack = {
  id: 't1',
  title: 'Song One',
  artist: 'Artist One',
  cover: { kind: 'none' as const },
  duration: '',
  albumId: '',
};

describe('LBCreatedForSection', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it('renders a shelf with the mix tracks once loaded', async () => {
    mockUseQuery.mockReturnValue({ data: [sampleTrack], isLoading: false });

    const view = await renderWithStore(
      <LBCreatedForSection sectionKey="lbCreatedForDailyJams" mixType="daily-jams" />
    );

    expect(view.getByText('Song One')).toBeTruthy();
  });

  it('renders nothing when ListenBrainz discovery is disabled', async () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    const view = await renderWithStore(
      <LBCreatedForSection sectionKey="lbCreatedForDailyJams" mixType="daily-jams" />,
      { discoveryEnabled: false }
    );

    expect(view.toJSON()).toBeNull();
    // enabled: false in the useQuery call, so it never asked for data.
    const options = mockUseQuery.mock.calls[0]?.[0];
    expect(options.enabled).toBe(false);
  });

  it('renders nothing without a configured LB username', async () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    const view = await renderWithStore(
      <LBCreatedForSection sectionKey="lbCreatedForDailyJams" mixType="daily-jams" />,
      { username: '' }
    );

    expect(view.toJSON()).toBeNull();
    const options = mockUseQuery.mock.calls[0]?.[0];
    expect(options.enabled).toBe(false);
  });

  it('stays hidden when the mix has no tracks', async () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false });

    const view = await renderWithStore(
      <LBCreatedForSection sectionKey="lbCreatedForDailyJams" mixType="daily-jams" />
    );

    expect(view.toJSON()).toBeNull();
  });

  it('shows a loading skeleton while the query is in flight', async () => {
    mockUseQuery.mockReturnValue({ data: undefined, isLoading: true });

    const view = await renderWithStore(
      <LBCreatedForSection sectionKey="lbCreatedForDailyJams" mixType="daily-jams" />
    );

    expect(view.toJSON()).not.toBeNull();
  });
});
