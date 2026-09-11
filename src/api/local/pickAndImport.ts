import * as DocumentPicker from 'expo-document-picker';

import { importLocalFiles } from '@/api/local/store';

export const LOCAL_AUDIO_MIME_TYPES = [
  'audio/mpeg',
  'audio/flac',
  'audio/mp4',
  'audio/x-m4a',
] as const;

export type LocalImportOutcome = Awaited<ReturnType<typeof importLocalFiles>>;

/**
 * Selects files through the platform picker and puts durable private copies in
 * the local-library index. A null result deliberately means the user cancelled
 * before selecting anything, not a failed import.
 */
export async function pickAndImportLocalFiles(): Promise<LocalImportOutcome | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: [...LOCAL_AUDIO_MIME_TYPES],
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  return importLocalFiles(result.assets);
}
