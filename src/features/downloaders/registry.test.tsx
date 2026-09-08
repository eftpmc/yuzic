import React, { type ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { ALL_DOWNLOADERS, useDownloaderStates } from './registry';
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

/**
 * `downloadAlbum` used to be required and `downloadTrack` optional, which was
 * Lidarr's shape — album-only, no way to fetch one file — written into the
 * contract for every downloader. SoulSync is the mirror image: its public
 * entry point takes one free-text track request and there is no album
 * endpoint at all. Both units are optional now, and the sheet offers a
 * downloader only for the unit it actually takes.
 */
describe('downloader units', () => {
  const by = (id: string) => ALL_DOWNLOADERS.find(d => d.id === id)!;

  it('lets each downloader declare the units it handles', () => {
    expect(by('lidarr').downloadAlbum).toBeDefined();
    expect(by('lidarr').downloadTrack).toBeUndefined();

    expect(by('slskd').downloadAlbum).toBeDefined();
    expect(by('slskd').downloadTrack).toBeDefined();

    expect(by('soulsync').downloadTrack).toBeDefined();
    expect(by('soulsync').downloadAlbum).toBeUndefined();
  });

  it('gives every downloader at least one unit and a way to read its queue', () => {
    for (const def of ALL_DOWNLOADERS) {
      expect(Boolean(def.downloadAlbum || def.downloadTrack)).toBe(true);
      expect(typeof def.fetchQueueWithDiff).toBe('function');
      // The success toast is looked up by these keys, so a downloader that
      // handles a unit has to name the string for it.
      if (def.downloadAlbum) expect(def.albumAddedKey).toBeTruthy();
      if (def.downloadTrack) expect(def.trackAddedKey).toBeTruthy();
    }
  });
});
