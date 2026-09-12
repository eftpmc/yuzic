import React, { type ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { ALL_DOWNLOADERS, useDownloaderStates } from './registry';
import { describeModule, moduleFillsSlot } from '@/features/integrations/types';
import downloadersReducer from '@/utils/redux/slices/downloadersSlice';
import serversReducer from '@/utils/redux/slices/serversSlice';
import * as lidarr from '@/api/lidarr';
import * as slskd from '@/api/slskd';
import * as soulsync from '@/api/soulsync';

jest.mock('@/api/lidarr', () => ({
  ...jest.requireActual('@/api/lidarr'),
  testConnection: jest.fn(),
}));
jest.mock('@/api/slskd', () => ({
  ...jest.requireActual('@/api/slskd'),
  testConnection: jest.fn(),
}));
jest.mock('@/api/soulsync', () => ({
  ...jest.requireActual('@/api/soulsync'),
  testConnection: jest.fn(),
}));


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

/**
 * Each downloader is also an `IntegrationModule`: it authenticates the same
 * way (an apiKey tier), wires `testConnection` to its existing per-provider
 * function, and declares an `acquisition.*` slot for exactly the units it
 * implements above. `fetchQueueWithDiff` stays downloader-operational and is
 * deliberately absent from `slots` — it isn't a product capability.
 */
describe('downloaders as IntegrationModules', () => {
  const by = (id: string) => ALL_DOWNLOADERS.find(d => d.id === id)!;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('declares apiKey auth for every downloader', () => {
    for (const def of ALL_DOWNLOADERS) {
      expect(def.auth.tier).toBe('apiKey');
      expect(def.auth.configKeys).toEqual(expect.arrayContaining(['serverUrl', 'apiKey']));
    }
  });

  it('declares slots matching each downloader\'s units', () => {
    expect(describeModule(by('lidarr')).slots.sort()).toEqual(['acquisition.album']);
    expect(describeModule(by('slskd')).slots.sort()).toEqual(['acquisition.album', 'acquisition.track'].sort());
    expect(describeModule(by('soulsync')).slots.sort()).toEqual(['acquisition.track']);

    expect(moduleFillsSlot(by('lidarr'), 'acquisition.album')).toBe(true);
    expect(moduleFillsSlot(by('lidarr'), 'acquisition.track')).toBe(false);
    expect(moduleFillsSlot(by('soulsync'), 'acquisition.track')).toBe(true);
    expect(moduleFillsSlot(by('soulsync'), 'acquisition.album')).toBe(false);
  });

  it('does not map fetchQueueWithDiff to any capability slot', () => {
    for (const def of ALL_DOWNLOADERS) {
      const slotValues = Object.values(def.slots);
      expect(slotValues).not.toContain(def.fetchQueueWithDiff);
    }
  });

  const config = { serverUrl: 'http://example.test', apiKey: 'key' };

  it('maps lidarr testConnection (boolean) to Health', async () => {
    (lidarr.testConnection as jest.Mock).mockResolvedValue(true);
    await expect(by('lidarr').testConnection(config)).resolves.toEqual({ ok: true });
    expect(lidarr.testConnection).toHaveBeenCalledWith({ serverUrl: config.serverUrl, apiKey: config.apiKey });
  });

  it('maps slskd testConnection (boolean) to Health', async () => {
    (slskd.testConnection as jest.Mock).mockResolvedValue(true);
    await expect(by('slskd').testConnection(config)).resolves.toEqual({ ok: true });
  });

  it('maps soulsync testConnection (boolean) to Health', async () => {
    (soulsync.testConnection as jest.Mock).mockResolvedValue(false);
    await expect(by('soulsync').testConnection(config)).resolves.toEqual({ ok: false });
  });
});
