import React, { type ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { useEnabledSearchSourceIds, useSearchSourceEnabled } from './useSearchSourcesEnabled';
import settingsReducer, {
  setSearchSourceEnabled,
  setDeezerDiscoveryEnabled,
} from '@/utils/redux/slices/settingsSlice';

jest.mock('@/hooks/useIsOffline', () => ({
  useIsOffline: () => mockIsOffline,
}));

// eslint-disable-next-line no-var -- hoisted for the jest.mock factory above
var mockIsOffline = false;

function makeStore() {
  return configureStore({ reducer: { settings: settingsReducer } });
}

function wrapper(store: ReturnType<typeof makeStore>) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  Wrapper.displayName = 'TestStoreWrapper';
  return Wrapper;
}

describe('useEnabledSearchSourceIds', () => {
  beforeEach(() => {
    mockIsOffline = false;
  });

  it('is empty by default — search enablement is independent of Home', async () => {
    const store = makeStore();
    // Turning Home discovery on must not leak into search enablement.
    store.dispatch(setDeezerDiscoveryEnabled(true));
    const { result } = await renderHook(() => useEnabledSearchSourceIds(), { wrapper: wrapper(store) });
    expect(result.current).toEqual([]);
  });

  it('includes a source once it is explicitly enabled for search', async () => {
    const store = makeStore();
    store.dispatch(setSearchSourceEnabled({ sourceId: 'deezer', enabled: true }));
    const { result } = await renderHook(() => useEnabledSearchSourceIds(), { wrapper: wrapper(store) });
    expect(result.current).toEqual(['deezer']);
  });

  it('drops every source while the device is offline', async () => {
    const store = makeStore();
    store.dispatch(setSearchSourceEnabled({ sourceId: 'deezer', enabled: true }));
    store.dispatch(setSearchSourceEnabled({ sourceId: 'musicbrainz', enabled: true }));
    mockIsOffline = true;
    const { result } = await renderHook(() => useEnabledSearchSourceIds(), { wrapper: wrapper(store) });
    expect(result.current).toEqual([]);
  });
});

describe('useSearchSourceEnabled', () => {
  beforeEach(() => {
    mockIsOffline = false;
  });

  it('reads one source in isolation', async () => {
    const store = makeStore();
    store.dispatch(setSearchSourceEnabled({ sourceId: 'musicbrainz', enabled: true }));
    const { result } = await renderHook(() => useSearchSourceEnabled('musicbrainz'), { wrapper: wrapper(store) });
    expect(result.current).toBe(true);
  });
});
