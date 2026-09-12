import React, { type ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { useLibraryState } from './useLibraryState';
import { makeLocalId } from '@/types/EntityId';
import type { ExternalAlbumBase } from '@/types';
import wantsReducer, { addWant } from '@/utils/redux/slices/wantsSlice';
import serversReducer, { addServer, setActiveServer } from '@/utils/redux/slices/serversSlice';
import downloadersReducer from '@/utils/redux/slices/downloadersSlice';
import type { Server } from '@/types/Server';

jest.mock('@/contexts/LibraryContext', () => ({
  useLibrary: () => ({ albums: [] }),
}));

function makeStore() {
  return configureStore({
    reducer: {
      wants: wantsReducer,
      servers: serversReducer,
      downloaders: downloadersReducer,
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

function externalAlbum(localId?: string): ExternalAlbumBase {
  return {
    id: 'ext-1',
    title: 'Some Album',
    artist: 'Some Artist',
    cover: { kind: 'none' },
    subtext: 'Some Artist',
    externalSource: 'deezer',
    ...(localId ? { localId: localId as ExternalAlbumBase['localId'] } : {}),
  } as ExternalAlbumBase;
}

describe('useLibraryState', () => {
  it('resolves to external (not wanted) when the store has no want for the localId', async () => {
    const store = makeStore();
    store.dispatch(addServer(testServer()));
    store.dispatch(setActiveServer(SERVER_ID));

    const localId = makeLocalId({ kind: 'album', externalSource: 'deezer', externalNativeId: 'ext-1' });
    const { result } = await renderHook(() => useLibraryState(externalAlbum(localId)), {
      wrapper: wrapper(store),
    });

    expect(result.current).toBe('external');
  });

  it('resolves to wanted when the store has an addWant entry for the album localId', async () => {
    const store = makeStore();
    store.dispatch(addServer(testServer()));
    store.dispatch(setActiveServer(SERVER_ID));

    const localId = makeLocalId({ kind: 'album', externalSource: 'deezer', externalNativeId: 'ext-1' });
    store.dispatch(addWant({
      serverId: SERVER_ID,
      want: { localId, unit: 'album', title: 'Some Album', artist: 'Some Artist', origin: 'search' },
    }));

    const { result } = await renderHook(() => useLibraryState(externalAlbum(localId)), {
      wrapper: wrapper(store),
    });

    expect(result.current).toBe('wanted');
  });

  it('is never wanted when the album has no localId', async () => {
    const store = makeStore();
    store.dispatch(addServer(testServer()));
    store.dispatch(setActiveServer(SERVER_ID));

    const { result } = await renderHook(() => useLibraryState(externalAlbum()), {
      wrapper: wrapper(store),
    });

    expect(result.current).toBe('external');
  });
});
