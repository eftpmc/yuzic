import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import WantsScreen from './WantsScreen';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string, opts?: any) => (opts?.title ? `${key}:${opts.title}` : key) }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ colors: { secondary: '#000', subtext: '#666', background: '#fff' } }),
}));

jest.mock('@/hooks/useScrollClearance', () => ({
  useScrollClearance: () => 0,
}));

jest.mock('@/hooks/useRadius', () => ({
  useRadius: () => ({ lg: 16, card: 8, thumb: 8, pill: 999, md: 8, pillFor: (n: number) => n / 2 }),
}));

jest.mock('@/hooks/useListDensity', () => ({
  useListDensity: () => ({ rowPadding: 8, rowGap: 8, trackRowPadding: 4 }),
}));

jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory can't reference outer-scope imports
  const { View } = require('react-native');
  return { SafeAreaView: View };
});

jest.mock('@/components/MediaImage', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory can't reference outer-scope imports
  const { View } = require('react-native');
  return { MediaImage: () => <View testID="media-image-mock" /> };
});

const mockOpen = jest.fn();
jest.mock('@/components/options/ManualAddWantSheet', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- jest.mock factory can't reference outer-scope imports
  const { Text } = require('react-native');
  return {
    useManualAddWantSheet: () => ({ open: mockOpen, sheet: <Text testID="manual-add-sheet-mock" /> }),
  };
});

let mockWants: any[] = [];
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: any) => selector({ __mockWants: true }),
  useDispatch: () => mockDispatch,
}));

jest.mock('@/utils/redux/selectors/wantsSelectors', () => ({
  selectWantsForActiveServer: () => mockWants,
}));
jest.mock('@/utils/redux/selectors/serversSelectors', () => ({
  selectActiveServerId: () => 'server-1',
}));
jest.mock('@/utils/redux/slices/wantsSlice', () => ({
  removeWant: (payload: any) => ({ type: 'wants/removeWant', payload }),
}));

describe('WantsScreen', () => {
  beforeEach(() => {
    mockWants = [];
    mockOpen.mockClear();
    mockDispatch.mockClear();
  });

  it('shows the empty state with zero providers/wants', async () => {
    const view = await render(<WantsScreen />);
    expect(view.getByText('wants.empty')).toBeTruthy();
  });

  it('lists every saved want', async () => {
    mockWants = [
      { localId: 'local:track:ext:manual:1', title: 'My Title', artist: 'My Artist', unit: 'track', origin: 'manual', createdAt: 1, updatedAt: 1 },
      { localId: 'local:album:ext:manual:2', title: 'Album Title', artist: 'Album Artist', unit: 'album', origin: 'manual', createdAt: 2, updatedAt: 2 },
    ];
    const view = await render(<WantsScreen />);

    expect(view.getAllByTestId('want-row')).toHaveLength(2);
    expect(view.getByText('My Title')).toBeTruthy();
    expect(view.getByText('Album Title')).toBeTruthy();
  });

  it('exposes the Manual Add opener wired to useManualAddWantSheet()', async () => {
    const view = await render(<WantsScreen />);
    fireEvent.press(view.getByTestId('wants-manual-add'));

    expect(mockOpen).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('manual-add-sheet-mock')).toBeTruthy();
  });

  it('removes a want when its remove control is pressed', async () => {
    mockWants = [
      { localId: 'local:track:ext:manual:1', title: 'My Title', artist: 'My Artist', unit: 'track', origin: 'manual', createdAt: 1, updatedAt: 1 },
    ];
    const view = await render(<WantsScreen />);

    fireEvent.press(view.getByLabelText('a11y.wants.remove:My Title'));

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'wants/removeWant',
      payload: { serverId: 'server-1', localId: 'local:track:ext:manual:1' },
    });
  });
});
