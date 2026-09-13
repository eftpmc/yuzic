import React from 'react';
import { render } from '@testing-library/react-native';

import SettingsConnectionRow from './SettingsConnectionRow';

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ colors: { secondary: '#111', subtext: '#666', border: '#ddd', themeColor: '#7c3aed' } }),
}));
jest.mock('@/hooks/useRadius', () => ({ useRadius: () => ({ pill: 999 }) }));

describe('SettingsConnectionRow', () => {
  it('pairs a human-readable state with a capability summary', async () => {
    const view = await render(
      <SettingsConnectionRow
        label="ListenBrainz"
        summary="Account and discovery"
        status="connected"
        statusLabel="Connected"
        onPress={jest.fn()}
      />
    );

    expect(view.getByText('ListenBrainz')).toBeTruthy();
    expect(view.getByText('Account and discovery')).toBeTruthy();
    expect(view.getByText('Connected')).toBeTruthy();
  });
});
