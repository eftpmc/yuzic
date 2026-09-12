import React, { type ReactNode } from 'react';
import { renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { ALL_SOURCES, getSourceMeta, useEnabledExternalSources } from './registry';
import { describeModule, moduleFillsSlot } from '@/features/integrations/types';
import settingsReducer, {
  setDeezerExternalEnabled,
  setMusicbrainzExternalEnabled,
} from '@/utils/redux/slices/settingsSlice';

function makeStore(overrides: Partial<{ deezerExternalEnabled: boolean; musicbrainzExternalEnabled: boolean }> = {}) {
  const store = configureStore({ reducer: { settings: settingsReducer } });
  if (overrides.deezerExternalEnabled !== undefined) {
    store.dispatch(setDeezerExternalEnabled(overrides.deezerExternalEnabled));
  }
  if (overrides.musicbrainzExternalEnabled !== undefined) {
    store.dispatch(setMusicbrainzExternalEnabled(overrides.musicbrainzExternalEnabled));
  }
  return store;
}

function wrapper(store: ReturnType<typeof makeStore>) {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  Wrapper.displayName = 'TestStoreWrapper';
  return Wrapper;
}

describe('getSourceMeta', () => {
  it('returns label/color for a known source and null otherwise', () => {
    expect(getSourceMeta('deezer')).toEqual(expect.objectContaining({ label: 'Deezer', color: expect.any(String) }));
    expect(getSourceMeta('musicbrainz')).toEqual(expect.objectContaining({ label: 'MusicBrainz', color: '#BA478F' }));
    expect(getSourceMeta('nonexistent')).toBeNull();
  });
});

describe('useEnabledExternalSources', () => {
  it('is empty when both sources are disabled (the default)', async () => {
    const store = makeStore();
    const { result } = await renderHook(() => useEnabledExternalSources(), { wrapper: wrapper(store) });
    expect(result.current).toEqual([]);
  });

  it('includes only the sources whose settings flag is enabled', async () => {
    const store = makeStore({ deezerExternalEnabled: true, musicbrainzExternalEnabled: false });
    const { result } = await renderHook(() => useEnabledExternalSources(), { wrapper: wrapper(store) });
    expect(result.current.map((s) => s.id)).toEqual(['deezer']);
  });

  it('includes both sources when both flags are enabled', async () => {
    const store = makeStore({ deezerExternalEnabled: true, musicbrainzExternalEnabled: true });
    const { result } = await renderHook(() => useEnabledExternalSources(), { wrapper: wrapper(store) });
    expect(result.current.map((s) => s.id).sort()).toEqual(['deezer', 'musicbrainz']);
  });
});

/**
 * Both sources are keyless public APIs — no credentials, no server URL, no
 * account — so they converge on the `IntegrationModule` contract with a
 * `'none'` auth tier and a trivial `testConnection` (nothing to authenticate;
 * "enabled" is a plain user setting, not a connection). Each declares both
 * `resolution` (its resolveArtist/resolveAlbum/fetchAlbum identity/metadata
 * work) and `discovery.shelf` (it feeds Home's external discovery shelves).
 */
describe('sources as IntegrationModules', () => {
  const by = (id: string) => ALL_SOURCES.find((s) => s.id === id)!;

  it('declares none auth for every source', () => {
    for (const def of ALL_SOURCES) {
      expect(def.auth.tier).toBe('none');
      expect(def.auth.configKeys).toBeUndefined();
    }
  });

  it('resolves testConnection to {ok: true} without any network call', async () => {
    for (const def of ALL_SOURCES) {
      await expect(def.testConnection({})).resolves.toEqual({ ok: true });
    }
  });

  it('declares resolution and discovery.shelf slots for both sources', () => {
    expect(describeModule(by('deezer')).slots.sort()).toEqual(['discovery.shelf', 'resolution'].sort());
    expect(describeModule(by('musicbrainz')).slots.sort()).toEqual(['discovery.shelf', 'resolution'].sort());

    expect(moduleFillsSlot(by('deezer'), 'resolution')).toBe(true);
    expect(moduleFillsSlot(by('deezer'), 'discovery.shelf')).toBe(true);
    expect(moduleFillsSlot(by('musicbrainz'), 'resolution')).toBe(true);
    expect(moduleFillsSlot(by('musicbrainz'), 'discovery.shelf')).toBe(true);

    // Not every capability slot is filled — sources don't do acquisition.
    expect(moduleFillsSlot(by('deezer'), 'acquisition.album')).toBe(false);
  });

  it('keeps the resolve/fetch methods callable independent of slots', () => {
    for (const def of ALL_SOURCES) {
      expect(typeof def.resolveArtist).toBe('function');
      expect(typeof def.resolveAlbum).toBe('function');
      expect(typeof def.fetchAlbum).toBe('function');
      expect(typeof def.fetchArtist).toBe('function');
      expect(typeof def.fetchArtistAlbums).toBe('function');
    }
  });
});
