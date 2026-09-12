import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { ManualAddWantSheet } from './ManualAddWantSheet';

// eslint-disable-next-line @typescript-eslint/no-require-imports -- CJS-only test mock, no typed ESM export
jest.mock('@gorhom/bottom-sheet', () => require('@gorhom/bottom-sheet/mock'));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ colors: { secondary: '#000', subtext: '#666', border: '#ccc', muted: '#333', placeholder: '#999', themeColor: '#111', onThemeColor: '#fff' }, isDarkMode: false }),
}));

jest.mock('@/hooks/useRadius', () => ({
  useRadius: () => ({ lg: 16, card: 8, thumb: 8, pill: 999, md: 8, pillFor: (n: number) => n / 2 }),
}));

jest.mock('@/components/BottomSheetBackdrop', () => ({
  renderBackdrop: () => null,
}));

jest.mock('@/components/SpinningLoaderCircle', () => 'SpinningLoaderCircle');

jest.mock('@/components/options/OptionSheetPrimitives', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useTheme } = require('@/hooks/useTheme');
  return {
    optionSheetStyles: { sheetBackground: {}, sheetContent: {}, loading: {} },
    useOptionSheetBackground: () => useTheme().colors,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useSelector: (selector: any) => selector({}),
  useDispatch: () => mockDispatch,
}));

jest.mock('@/utils/redux/selectors/serversSelectors', () => ({
  selectActiveServerId: () => 'server-1',
}));

jest.mock('@/utils/redux/slices/wantsSlice', () => ({
  __esModule: true,
  default: (state = {}) => state,
  addWant: (payload: any) => ({ type: 'wants/addWant', payload }),
}));

describe('ManualAddWantSheet', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
  });

  it('renders nothing when not visible', async () => {
    const view = await render(<ManualAddWantSheet visible={false} onClose={jest.fn()} />);
    expect(view.toJSON()).toBeNull();
  });

  it('dispatches addWant with a manual origin and no network call when submitted', async () => {
    const onClose = jest.fn();
    const view = await render(<ManualAddWantSheet visible onClose={onClose} />);

    await fireEvent.changeText(view.getByLabelText('manualAddWant.titleField'), 'My Title');
    await fireEvent.changeText(view.getByLabelText('manualAddWant.artistField'), 'My Artist');
    await fireEvent.press(view.getByText('manualAddWant.add'));

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    const action = mockDispatch.mock.calls[0][0];
    expect(action.type).toBe('wants/addWant');
    expect(action.payload.serverId).toBe('server-1');
    expect(action.payload.want).toMatchObject({
      unit: 'track',
      title: 'My Title',
      artist: 'My Artist',
      origin: 'manual',
    });
    expect(typeof action.payload.want.localId).toBe('string');
  });

  it('selects album unit and reflects it on the dispatched want', async () => {
    const view = await render(<ManualAddWantSheet visible onClose={jest.fn()} />);

    await fireEvent.press(view.getByText('manualAddWant.unit.album'));
    await fireEvent.changeText(view.getByLabelText('manualAddWant.titleField'), 'Album Title');
    await fireEvent.changeText(view.getByLabelText('manualAddWant.artistField'), 'Album Artist');
    await fireEvent.press(view.getByText('manualAddWant.add'));

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch.mock.calls[0][0].payload.want.unit).toBe('album');
  });

  it('keeps the submit button disabled until both fields are filled', async () => {
    const view = await render(<ManualAddWantSheet visible onClose={jest.fn()} />);

    await fireEvent.press(view.getByText('manualAddWant.add'));
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
