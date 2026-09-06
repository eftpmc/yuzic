import type { Server } from '@/types';
import { selectedLibraryIds, libraryScopePatch } from './registry';

function serverOf(type: Server['type'], auth: Server['auth']): Server {
  return {
    id: `${type}-1`,
    type,
    serverUrl: 'https://media.example',
    username: 'ari',
    auth,
    isAuthenticated: true,
  };
}

/**
 * Which key holds the chosen libraries is the provider's business, not the
 * screen's — two screens used to branch on server type to pick between
 * `musicFolderIds` and `parentIds`, and to fall back to the singular key each
 * had before multi-select. Both now ask the registry.
 */
describe('library scope', () => {
  it('reads the array key each provider writes', () => {
    expect(selectedLibraryIds(serverOf('navidrome', { musicFolderIds: ['1', '2'] })))
      .toEqual(['1', '2']);
    expect(selectedLibraryIds(serverOf('jellyfin', { parentIds: ['a'] })))
      .toEqual(['a']);
    expect(selectedLibraryIds(serverOf('emby', { parentIds: ['a', 'b'] })))
      .toEqual(['a', 'b']);
  });

  it('lifts the pre-multi-select singular key, so an upgrading install keeps its scope', () => {
    expect(selectedLibraryIds(serverOf('navidrome', { musicFolderId: '7' }))).toEqual(['7']);
    expect(selectedLibraryIds(serverOf('jellyfin', { parentId: 'x' }))).toEqual(['x']);
  });

  it('treats no selection as all libraries', () => {
    expect(selectedLibraryIds(serverOf('navidrome', {}))).toEqual([]);
    expect(selectedLibraryIds(serverOf('emby', undefined))).toEqual([]);
  });

  it('writes back under the same key it reads', () => {
    const navidrome = serverOf('navidrome', { musicFolderIds: ['1'] });
    const patched = { ...navidrome.auth, ...libraryScopePatch(navidrome, ['2', '3']) };
    expect(selectedLibraryIds({ ...navidrome, auth: patched })).toEqual(['2', '3']);

    const jellyfin = serverOf('jellyfin', { parentIds: ['a'] });
    expect(libraryScopePatch(jellyfin, ['b'])).toEqual({ parentIds: ['b'] });
  });
});
