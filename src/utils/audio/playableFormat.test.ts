import { formatOf, playableQuality } from './playableFormat';

describe('formatOf', () => {
  it('prefers the MIME type', () => {
    expect(formatOf({ mimeType: 'audio/ogg', filePath: '/x/y.flac' })).toBe('ogg');
  });

  it('strips parameters and the x- prefix', () => {
    expect(formatOf({ mimeType: 'audio/x-flac; charset=binary' })).toBe('flac');
  });

  it('falls back to the file extension', () => {
    expect(formatOf({ filePath: '/music/Tame Impala/03 - Borderline.ogg' })).toBe('ogg');
  });

  /** A path with a dot in a directory name must not be read as a format. */
  it('ignores an implausible extension', () => {
    expect(formatOf({ filePath: '/music/no-extension-here' })).toBeNull();
  });

  it('is null when nothing says what the file is', () => {
    expect(formatOf({})).toBeNull();
  });
});

describe('playableQuality', () => {
  /**
   * Vorbis used to be transcoded here. The engine vendors libvorbis now, so
   * the file the bug was reported against stays at Original and is decoded on
   * the device — which is the whole point of choosing Original.
   */
  it('keeps Ogg Vorbis at original, because the engine decodes it', () => {
    expect(playableQuality({ mimeType: 'audio/ogg' }, 'original', 'ios')).toBe('original');
    expect(playableQuality({ filePath: 'a/b.ogg' }, 'original', 'ios')).toBe('original');
  });

  it('leaves Ogg alone on Android too', () => {
    expect(playableQuality({ mimeType: 'audio/ogg' }, 'original', 'android')).toBe('original');
  });

  it('leaves formats iOS can decode at original', () => {
    for (const mimeType of ['audio/flac', 'audio/mpeg', 'audio/mp4', 'audio/x-aiff']) {
      expect(playableQuality({ mimeType }, 'original', 'ios')).toBe('original');
    }
  });

  /** Opus is still undecoded here — libvorbis is not libopus. */
  it('transcodes Opus on iOS', () => {
    expect(playableQuality({ filePath: 'a/b.opus' }, 'original', 'ios')).toBe('high');
    expect(playableQuality({ mimeType: 'audio/opus' }, 'original', 'ios')).toBe('high');
  });

  /**
   * Only `original` asks for the raw file, so nothing else can produce this
   * failure and nothing else should be touched.
   */
  it('never changes a quality that already transcodes', () => {
    for (const quality of ['low', 'medium', 'high'] as const) {
      expect(playableQuality({ mimeType: 'audio/opus' }, quality, 'ios')).toBe(quality);
    }
  });

  /**
   * An unknown format keeps today's behaviour rather than transcoding
   * defensively: metadata is often missing, and downgrading every track
   * without a MIME type would quietly cost quality across a whole library to
   * avoid a failure that may not exist.
   */
  it('leaves a track alone when the format is unknown', () => {
    expect(playableQuality({}, 'original', 'ios')).toBe('original');
  });
});
