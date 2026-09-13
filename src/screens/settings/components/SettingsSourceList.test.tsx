import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import SettingsSourceList from './SettingsSourceList';

jest.mock('@/hooks/useTheme', () => ({
  useTheme: () => ({ colors: { themeColor: '#7c3aed', secondary: '#111', subtext: '#666', border: '#ddd', background: '#fff' } }),
}));
jest.mock('@/hooks/useRadius', () => ({ useRadius: () => ({ pill: 999 }) }));

jest.mock('react-native-draggable-flatlist', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockDraggableList = ({ data, renderItem, onDragEnd }: any) => (
    <View testID="draggable-source-list">
      {data.map((item: any, index: number) => (
        <React.Fragment key={item.id}>
          {renderItem({ item, getIndex: () => index, drag: jest.fn(), isActive: false })}
        </React.Fragment>
      ))}
      <View testID="complete-source-reorder" onTouchEnd={() => onDragEnd({ data: [...data].reverse() })} />
    </View>
  );
  return MockDraggableList;
});

describe('SettingsSourceList', () => {
  const sources = [
    { id: 'deezer', label: 'Deezer', subtext: 'Artwork', enabled: true, onEnabledChange: jest.fn() },
    { id: 'coverartarchive', label: 'Cover Art Archive', subtext: 'Artwork', enabled: true, onEnabledChange: jest.fn() },
  ];

  it('keeps the server source visibly first and persists a drag reorder', async () => {
    const onOrderChange = jest.fn();
    const view = await render(
      <SettingsSourceList
        pinnedSource={{ label: 'Your server', subtext: 'Always checked first' }}
        sources={sources}
        onOrderChange={onOrderChange}
      />
    );

    expect(view.getByText('Your server')).toBeTruthy();
    expect(view.getByText('First')).toBeTruthy();
    fireEvent(view.getByTestId('complete-source-reorder'), 'touchEnd');
    expect(onOrderChange).toHaveBeenCalledWith(['coverartarchive', 'deezer']);
  });

  it('does not expose a drag affordance until two enabled sources can be reordered', async () => {
    const view = await render(
      <SettingsSourceList
        sources={[{ ...sources[0], enabled: false }]}
        onOrderChange={jest.fn()}
      />
    );

    expect(view.queryByTestId('source-drag-deezer')).toBeNull();
  });
});
