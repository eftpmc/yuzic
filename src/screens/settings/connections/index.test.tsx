import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import ConnectionsView from './index';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: string) => {
    switch (selector) {
      case 'lbAuthenticated':
        return false;
      case 'deezerEnabled':
        return true;
      case 'musicbrainzEnabled':
        return false;
      case 'lastfmEnabled':
        return true;
      case 'lbDiscoveryEnabled':
        return false;
      case 'audiomuseEnabled':
        return true;
      default:
        return undefined;
    }
  },
}));

jest.mock('@/utils/redux/selectors/listenbrainzSelectors', () => ({
  selectListenBrainzAuthenticated: 'lbAuthenticated',
}));

jest.mock('@/utils/redux/selectors/settingsSelectors', () => ({
  selectAnyDeezerEnabled: 'deezerEnabled',
  selectMusicbrainzExternalEnabled: 'musicbrainzEnabled',
  selectLastfmEnabled: 'lastfmEnabled',
  selectListenbrainzDiscoveryEnabled: 'lbDiscoveryEnabled',
}));

jest.mock('@/utils/redux/selectors/audiomuseSelectors', () => ({
  selectAudiomuseEnabled: 'audiomuseEnabled',
}));

jest.mock('@/features/downloaders/registry', () => ({
  useDownloaderStates: () => [
    { def: { id: 'lidarr', settingsRoute: '/settings/lidarrView' }, isConnected: true },
    { def: { id: 'slskd', settingsRoute: '/settings/slskdView' }, isConnected: false },
    { def: { id: 'soulsync', settingsRoute: '/settings/soulsyncView' }, isConnected: false },
  ],
}));

describe('ConnectionsView', () => {
  it('lists every provider from both former hubs with its route', async () => {
    const view = await render(<ConnectionsView />);

    // Library & discovery sources (formerly the Integrations hub).
    expect(view.getByText('Deezer')).toBeTruthy();
    expect(view.getByText('MusicBrainz')).toBeTruthy();
    expect(view.getByText('Last.fm')).toBeTruthy();
    expect(view.getByText('ListenBrainz')).toBeTruthy();
    expect(view.getByText('AudioMuse-AI')).toBeTruthy();

    // Downloaders (formerly the Downloaders hub) — labelled via i18n keys,
    // which the mocked i18n instance echoes back as the key itself.
    expect(view.getByText('settings.downloaders.lidarr.title')).toBeTruthy();
    expect(view.getByText('settings.downloaders.slskd.title')).toBeTruthy();
    expect(view.getByText('settings.downloaders.soulsync.title')).toBeTruthy();

    fireEvent.press(view.getByText('Deezer'));
    expect(mockPush).toHaveBeenCalledWith('/settings/deezerView');

    fireEvent.press(view.getByText('settings.downloaders.lidarr.title'));
    expect(mockPush).toHaveBeenCalledWith('/settings/lidarrView');
  });
});
