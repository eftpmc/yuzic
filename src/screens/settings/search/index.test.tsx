import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import SearchSettings from './index';

const mockDispatch = jest.fn();
let mockDeezerEnabled = false;
let mockMusicbrainzEnabled = false;

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

jest.mock('react-redux', () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: string) => {
    switch (selector) {
      case 'deezerSearchEnabled':
        return mockDeezerEnabled;
      case 'musicbrainzSearchEnabled':
        return mockMusicbrainzEnabled;
      default:
        return undefined;
    }
  },
}));

jest.mock('@/utils/redux/selectors/settingsSelectors', () => ({
  selectSearchSourceEnabled: (sourceId: string) =>
    sourceId === 'deezer' ? 'deezerSearchEnabled' : 'musicbrainzSearchEnabled',
}));

jest.mock('@/utils/redux/slices/settingsSlice', () => ({
  setSearchSourceEnabled: (payload: unknown) => ({ type: 'settings/setSearchSourceEnabled', payload }),
}));

describe('SearchSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeezerEnabled = false;
    mockMusicbrainzEnabled = false;
  });

  it('lists both sources, independent of any Home/discovery state', async () => {
    const view = await render(<SearchSettings />);
    expect(view.getByText('settings.search.deezer')).toBeTruthy();
    expect(view.getByText('settings.search.musicbrainz')).toBeTruthy();
  });

  it('dispatches setSearchSourceEnabled for the toggled source only', async () => {
    const view = await render(<SearchSettings />);
    const deezerSwitch = view.getAllByRole('switch')[0];
    fireEvent(deezerSwitch, 'valueChange', true);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'settings/setSearchSourceEnabled',
      payload: { sourceId: 'deezer', enabled: true },
    });
  });

  it('reflects each source’s current search-enabled state', async () => {
    mockDeezerEnabled = true;
    mockMusicbrainzEnabled = false;
    const view = await render(<SearchSettings />);
    const switches = view.getAllByRole('switch');
    expect(switches[0].props.value).toBe(true);
    expect(switches[1].props.value).toBe(false);
  });
});
