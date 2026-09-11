import React from 'react';
import { act, render } from '@testing-library/react-native';

import UserAvatar from './UserAvatar';
import { controlSize } from '@/constants/design';

let focusEffect: (() => void) | undefined;
const mockAvatarUrl = jest.fn();

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => {
    focusEffect = effect;
  },
}));

jest.mock('@/api', () => ({
  useApi: () => ({ user: { avatarUrl: mockAvatarUrl } }),
}));

jest.mock('react-redux', () => ({
  useSelector: (selector: string) => selector === 'themeColor' ? '#123456' : 'server-1',
}));

jest.mock('@/utils/redux/selectors/settingsSelectors', () => ({
  selectThemeColor: 'themeColor',
}));

jest.mock('@/utils/redux/selectors/serversSelectors', () => ({
  selectActiveServerId: 'activeServerId',
}));

describe('UserAvatar', () => {
  beforeEach(() => {
    focusEffect = undefined;
    mockAvatarUrl.mockReset()
      .mockReturnValue('https://music.example/avatar.png');
  });

  it('reloads a stable avatar URL when its screen is focused again', async () => {
    const view = await render(<UserAvatar username="Zack" size={controlSize.avatarTabHeader} borderRadius={16} />);

    expect(view.getByTestId('user-avatar-image').props.source).toEqual({
      uri: 'https://music.example/avatar.png',
      cache: 'default',
    });
    expect(focusEffect).toBeDefined();

    await act(async () => focusEffect?.());

    expect(mockAvatarUrl).toHaveBeenCalledTimes(1);
    expect(view.getByTestId('user-avatar-image').props.source).toEqual({
      uri: 'https://music.example/avatar.png',
      cache: 'reload',
    });
  });
});
