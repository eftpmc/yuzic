import * as DocumentPicker from 'expo-document-picker';

import { importLocalFiles } from './store';
import { LOCAL_AUDIO_MIME_TYPES, pickAndImportLocalFiles } from './pickAndImport';

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));
jest.mock('./store', () => ({ importLocalFiles: jest.fn() }));

const getDocumentAsync = DocumentPicker.getDocumentAsync as jest.MockedFunction<typeof DocumentPicker.getDocumentAsync>;
const mockImport = importLocalFiles as jest.MockedFunction<typeof importLocalFiles>;

describe('pickAndImportLocalFiles', () => {
  beforeEach(() => jest.resetAllMocks());

  it('uses the supported audio picker contract and imports selected assets', async () => {
    const assets = [{ uri: 'file:///cache/track.mp3', name: 'track.mp3' }];
    getDocumentAsync.mockResolvedValue({ canceled: false, assets } as Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>);
    mockImport.mockResolvedValue({ imported: 1, unsupported: 0, failed: 0 });

    await expect(pickAndImportLocalFiles()).resolves.toEqual({ imported: 1, unsupported: 0, failed: 0 });
    expect(getDocumentAsync).toHaveBeenCalledWith({
      type: [...LOCAL_AUDIO_MIME_TYPES],
      multiple: true,
      copyToCacheDirectory: true,
    });
    expect(mockImport).toHaveBeenCalledWith(assets);
  });

  it('does not import when the picker is cancelled', async () => {
    getDocumentAsync.mockResolvedValue({ canceled: true, assets: null } as unknown as Awaited<ReturnType<typeof DocumentPicker.getDocumentAsync>>);

    await expect(pickAndImportLocalFiles()).resolves.toBeNull();
    expect(mockImport).not.toHaveBeenCalled();
  });
});
