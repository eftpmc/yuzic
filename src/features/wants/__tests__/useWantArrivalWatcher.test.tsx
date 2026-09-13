import React, { type ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import wantsReducer, { addWant } from '@/utils/redux/slices/wantsSlice';
import serversReducer, { addServer, setActiveServer } from '@/utils/redux/slices/serversSlice';
import { makeLocalId } from '@/types/EntityId';
import type { Server } from '@/types/Server';
import type { AlbumBase } from '@/types';
import { useWantArrivalWatcher } from '../useWantArrivalWatcher';

const WANT_1_LOCAL_ID = makeLocalId({ kind: 'album', externalSource: 'deezer', externalNativeId: 'w-1' });
const WANT_2_LOCAL_ID = makeLocalId({ kind: 'album', externalSource: 'deezer', externalNativeId: 'w-2' });

const mockToastSuccess = jest.fn();
jest.mock('@/components/toast', () => ({
  notify: { success: (...args: unknown[]) => mockToastSuccess(...args) },
}));

// Library membership is driven directly through this mock so tests can move
// an album "into" the library between renders without a real sync/redux path.
// jest.mock calls are hoisted above all imports by Babel, so this takes
// effect for `useWantArrivalWatcher`'s own import of LibraryContext above.
let mockAlbums: AlbumBase[] = [];
let mockTracks: AlbumBase[] = [];
jest.mock('@/contexts/LibraryContext', () => ({
  useLibrary: () => ({ albums: mockAlbums, tracks: mockTracks }),
}));

const SERVER_ID = 'server-1';

function testServer(): Server {
  return {
    id: SERVER_ID,
    type: 'jellyfin',
    serverUrl: 'https://example.com',
    username: 'u',
    isAuthenticated: true,
  };
}

function libraryAlbum(): AlbumBase {
  return {
    id: 'lib-album-1',
    title: 'Some Album',
    cover: { kind: 'none' },
    subtext: 'Some Artist',
    artist: { id: 'artist-1', name: 'Some Artist', cover: { kind: 'none' }, subtext: '' },
    year: 2020,
    genres: [],
    created: new Date(),
  };
}

function makeStore() {
  return configureStore({
    reducer: {
      wants: wantsReducer,
      servers: serversReducer,
    },
  });
}

function wrapper(store: ReturnType<typeof makeStore>) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  Wrapper.displayName = 'TestStoreWrapper';
  return Wrapper;
}

beforeEach(() => {
  mockAlbums = [];
  mockTracks = [];
  mockToastSuccess.mockReset();
});

describe('useWantArrivalWatcher', () => {
  it('removes a want and toasts once when its album appears in the library', async () => {
    const store = makeStore();
    store.dispatch(addServer(testServer()));
    store.dispatch(setActiveServer(SERVER_ID));
    store.dispatch(
      addWant({
        serverId: SERVER_ID,
        want: { localId: WANT_1_LOCAL_ID, unit: 'album', title: 'Some Album', artist: 'Some Artist', origin: 'search' },
      })
    );

    const { rerender } = await renderHook(() => useWantArrivalWatcher(), { wrapper: wrapper(store) });

    expect(store.getState().wants.byServer[SERVER_ID]).toHaveLength(1);
    expect(mockToastSuccess).not.toHaveBeenCalled();

    // The entity arrives in the synced library (any route — a Get, a manual
    // copy, Bandcamp — arrival detection doesn't care which).
    mockAlbums = [libraryAlbum()];
    await rerender({});

    expect(store.getState().wants.byServer[SERVER_ID]).toEqual([]);
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);

    // A further re-render with the same library state must not re-fire —
    // the want is already gone, and the resolved-guard prevents any replay
    // even if the selector briefly still returned it.
    await rerender({});
    expect(mockToastSuccess).toHaveBeenCalledTimes(1);
  });

  it('does not remove or toast for a want whose entity never appears', async () => {
    const store = makeStore();
    store.dispatch(addServer(testServer()));
    store.dispatch(setActiveServer(SERVER_ID));
    store.dispatch(
      addWant({
        serverId: SERVER_ID,
        want: { localId: WANT_2_LOCAL_ID, unit: 'album', title: 'Missing Album', artist: 'Nobody', origin: 'search' },
      })
    );

    await renderHook(() => useWantArrivalWatcher(), { wrapper: wrapper(store) });

    expect(store.getState().wants.byServer[SERVER_ID]).toHaveLength(1);
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });
});
