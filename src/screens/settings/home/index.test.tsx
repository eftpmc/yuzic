import React from 'react';
import { render } from '@testing-library/react-native';

import Settings from './index';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '0.0.0' } } }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('react-redux', () => ({ useSelector: () => ({ type: 'navidrome', username: 'tester', serverUrl: 'https://example.test' }) }));
jest.mock('@/features/downloaders/registry', () => ({ useAnyDownloaderConnected: () => false }));
jest.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ colors: { background: '#000', muted: '#222', secondary: '#fff', subtext: '#aaa' } }) }));
jest.mock('@/hooks/useRadius', () => ({ useRadius: () => ({ pill: 999 }) }));
jest.mock('@/hooks/useScrollClearance', () => ({ useScrollClearance: () => 24 }));
jest.mock('../components/Header', () => () => null);
jest.mock('../components/SettingsCard', () => {
  const SettingsCard = ({ children }: any) => <>{children}</>;
  return SettingsCard;
});
jest.mock('../components/SettingsDivider', () => () => null);
jest.mock('../components/SettingsRow', () => {
  const { Text } = require('react-native');
  const SettingsRow = ({ label }: any) => <Text>{label}</Text>;
  return SettingsRow;
});
jest.mock('@/components/Touchable', () => {
  const Touchable = ({ children }: any) => <>{children}</>;
  return Touchable;
});
jest.mock('@/components/UserAvatar', () => () => null);

describe('Settings home', () => {
  it('separates discovery controls from the general card', async () => {
    const view = await render(<Settings />);

    expect(view.getByText('settings.sections.general')).toBeTruthy();
    expect(view.getByText('settings.sections.discovery')).toBeTruthy();
    expect(view.getByText('settings.home.title')).toBeTruthy();
    expect(view.getByText('settings.metadata.title')).toBeTruthy();
    expect(view.getByText('settings.search.title')).toBeTruthy();
    expect(view.getByText('settings.scrobbling.title')).toBeTruthy();
  });
});
