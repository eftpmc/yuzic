import React from 'react';
import { render } from '@testing-library/react-native';

import ListenBrainzView from './index';

jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/components/toast', () => ({ notify: { error: jest.fn(), success: jest.fn(), info: jest.fn(), loading: jest.fn(), dismiss: jest.fn() } }));
jest.mock('react-redux', () => ({ useSelector: (selector: string) => ({
  username: selector === 'username' ? '' : undefined,
  token: selector === 'token' ? '' : undefined,
  authenticated: selector === 'authenticated' ? false : undefined,
  config: selector === 'config' ? null : undefined,
  activeServer: selector === 'activeServer' ? { id: 'server-1' } : undefined,
}[selector]), useDispatch: () => jest.fn() }));
jest.mock('@/utils/redux/selectors/listenbrainzSelectors', () => ({
  selectListenBrainzUsername: 'username',
  selectListenBrainzToken: 'token',
  selectListenBrainzAuthenticated: 'authenticated',
  selectListenBrainzConfig: 'config',
}));
jest.mock('@/utils/redux/selectors/serversSelectors', () => ({ selectActiveServer: 'activeServer' }));
jest.mock('@/utils/redux/slices/listenbrainzSlice', () => ({
  setUsername: jest.fn(), setToken: jest.fn(), setAuthenticated: jest.fn(), disconnect: jest.fn(),
}));
jest.mock('@/api/listenbrainz', () => ({ testConnection: jest.fn() }));
jest.mock('../../components/SettingsScreen', () => ({ children }: any) => <>{children}</>);
jest.mock('../../components/SettingsAuthCard', () => () => null);
jest.mock('../../components/SettingsDisconnectButton', () => () => null);

describe('ListenBrainzView', () => {
  it('keeps account setup free of the Home discovery toggle', async () => {
    const view = await render(<ListenBrainzView />);

    expect(view.queryByText('settings.listenBrainz.discovery')).toBeNull();
    expect(view.queryByText('settings.listenBrainz.discoveryDescription')).toBeNull();
  });
});
