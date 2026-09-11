/* eslint-disable import/first -- Jest mocks must be registered before these imports. */
jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///documents/',
  getInfoAsync: jest.fn(async () => ({ exists: true })),
  makeDirectoryAsync: jest.fn(async () => {}),
  copyAsync: jest.fn(async () => {}),
  deleteAsync: jest.fn(async () => {}),
}));

import * as FileSystem from 'expo-file-system/legacy';
import { getAudioMetadata } from '@missingcore/audio-metadata';
import { mmkv } from '@/utils/mmkvStorage';
import { importLocalFiles, readLocalLibrary, setLocalStarred } from './store';

describe('local-library import', () => {
  beforeEach(() => {
    mmkv.clearAll();
    jest.clearAllMocks();
    (getAudioMetadata as jest.Mock).mockResolvedValue({
      metadata: { name: 'Track', artist: 'Artist', album: 'Album', track: 2, year: 2024 },
    });
  });

  it('copies supported files into private storage and indexes tag data', async () => {
    const result = await importLocalFiles([
      { uri: 'file:///cache/Track.flac', name: 'Track.flac' },
      { uri: 'file:///cache/notes.txt', name: 'notes.txt' },
    ]);

    expect(result).toEqual({ imported: 1, unsupported: 1 });
    expect(FileSystem.copyAsync).toHaveBeenCalledWith(expect.objectContaining({
      from: 'file:///cache/Track.flac',
      to: expect.stringMatching(/^file:\/\/\/documents\/local-library\/local-[\w-]+\.flac$/),
    }));
    expect(getAudioMetadata).toHaveBeenCalledWith(expect.stringContaining('/local-library/local-'), expect.any(Array));

    const [track] = readLocalLibrary().tracks;
    expect(track).toEqual(expect.objectContaining({
      title: 'Track', artist: 'Artist', albumTitle: 'Album', trackNumber: 2,
      sourceServerType: 'local', streamUrl: expect.stringContaining('/local-library/'),
    }));
  });

  it('persists local favourites with the index', async () => {
    await importLocalFiles([{ uri: 'file:///cache/Track.mp3', name: 'Track.mp3' }]);
    const [track] = readLocalLibrary().tracks;
    setLocalStarred(track.id, true);
    expect(readLocalLibrary().starredIds).toEqual([track.id]);
  });
});
