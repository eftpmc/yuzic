import React, { type ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { useDownloaderStates } from './registry';
import downloadersReducer from '@/utils/redux/slices/downloadersSlice';
import serversReducer from '@/utils/redux/slices/serversSlice';

/**
 * The identity of this hook's result is load-bearing: DownloadersQueueProvider
 * derives `connectedStates` from it and uses that as a useEffect dependency.
 * A fresh array per render there turned the provider into an infinite render
 * loop ("Maximum update depth exceeded"), so identity is worth pinning down.
 */
function makeStore() {
  return configureStore({
    reducer: { downloaders: downloadersReducer, servers: serversReducer },
  });
}

function wrapper(store: ReturnType<typeof makeStore>) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  Wrapper.displayName = 'TestStoreWrapper';
  return Wrapper;
}

describe('useDownloaderStates', () => {
  it('returns a referentially stable array across re-renders', async () => {
    const store = makeStore();
    const { result, rerender } = await renderHook(() => useDownloaderStates(), {
      wrapper: wrapper(store),
    });

    const first = result.current;
    expect(first.length).toBeGreaterThan(0);
    expect(first.every((s) => typeof s.def.id === 'string')).toBe(true);
    // Nothing configured in a bare store, so nothing is connected.
    expect(first.some((s) => s.isConnected)).toBe(false);

    await rerender({});
    await rerender({});

    expect(result.current).toBe(first);
  });
});
