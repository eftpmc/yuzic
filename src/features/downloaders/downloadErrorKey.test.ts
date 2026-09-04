import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import ja from '@/locales/ja.json';
import zh from '@/locales/zh.json';
import { downloadErrorKey } from './errorKeys';

// Kept in step with the error code unions the two downloaders export. A code
// added there without a translation here shows the user a generic failure.
const LIDARR_CODES = [
  'missing_album_identity',
  'artist_identity_unresolved',
  'artist_identity_ambiguous',
  'external_identity_mismatch',
  'album_not_found_for_artist',
  'album_identity_ambiguous',
  'lidarr_metadata_unavailable',
  'request_timeout',
] as const;

const SLSKD_CODES = [
  'missing_identity',
  'search_failed',
  'search_timeout',
  'no_matching_release',
  'no_matching_track',
  'enqueue_failed',
  'request_failed',
] as const;

const LOCALES = { en, fr, ja, zh } as Record<string, Record<string, any>>;

function lookup(bundle: Record<string, any>, key: string): unknown {
  return key.split('.').reduce<any>((node, part) => node?.[part], bundle);
}

describe('downloadErrorKey', () => {
  it('builds a downloader-scoped key from the code', () => {
    expect(downloadErrorKey('slskd', 'no_matching_release')).toBe(
      'externalAlbum.download.errors.slskd.no_matching_release'
    );
  });

  it('falls back to the generic failure key when there is no code', () => {
    expect(downloadErrorKey('lidarr', undefined)).toBe('externalAlbum.download.failed');
  });

  describe.each(Object.keys(LOCALES))('%s translations', (locale) => {
    const bundle = LOCALES[locale];

    it('translates the generic failure key', () => {
      expect(typeof lookup(bundle, 'externalAlbum.download.failed')).toBe('string');
    });

    it.each(LIDARR_CODES)('translates lidarr %s', (code) => {
      expect(typeof lookup(bundle, downloadErrorKey('lidarr', code))).toBe('string');
    });

    it.each(SLSKD_CODES)('translates slskd %s', (code) => {
      expect(typeof lookup(bundle, downloadErrorKey('slskd', code))).toBe('string');
    });
  });
});
