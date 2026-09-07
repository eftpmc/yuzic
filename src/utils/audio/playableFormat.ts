import { Platform } from 'react-native';
import type { AudioQuality } from '@/utils/redux/slices/settingsSlice';

/**
 * Whether the platform's decoder can open a file at all.
 *
 * "Original" quality asks the server for the untouched file, which is the
 * right default — it is the only way to hear a lossless library losslessly.
 * It is also the one setting that can produce a track the device cannot play,
 * and the failure is total rather than degraded: the reader cannot open the
 * stream, so nothing comes out.
 *
 * That is not hypothetical. An Ogg Vorbis album on a Navidrome server played
 * on every quality except Original, where Core Audio has no Vorbis decoder and
 * the track failed with "Unable to play track" — one album unplayable while
 * the rest of the library was fine. The engine now vendors libvorbis and
 * decodes those itself, so Vorbis is on the decodable list and the transcode
 * is no longer needed for it.
 *
 * Opus stays off the list: nothing decodes it here yet. The residual gap is
 * Opus inside a `.ogg` rather than a `.opus`, which is unusual but legal —
 * the extension says Vorbis, so this leaves it at Original, the engine's
 * sniff correctly declines to treat it as Vorbis, and Core Audio cannot open
 * it either. That file fails where it used to transcode. Narrow enough to
 * accept knowingly rather than transcode every Vorbis library to avoid.
 */

/**
 * What iOS can decode, by container or codec.
 *
 * A list of what *works* rather than what does not, deliberately. An unknown
 * format then transcodes — which costs some quality and some server CPU — and
 * the alternative is a track that will not play. Getting this wrong in the
 * safe direction is audible; getting it wrong in the other direction is
 * silent.
 *
 * Core Audio has no Vorbis, Opus, WavPack, Musepack or APE decoder. Android
 * is not listed because Media3 handles all of those, which is why this is
 * platform-specific rather than a general capability list.
 */
const IOS_DECODABLE = [
  'mp3', 'mpeg',
  'aac', 'm4a', 'm4b', 'mp4',
  'alac',
  'flac',
  'wav', 'wave', 'x-wav',
  'aif', 'aiff', 'x-aiff',
  'caf',
  // Not Core Audio's — the engine vendors libvorbis and decodes these itself,
  // which is why a self-hosted Vorbis library can stay on Original.
  'ogg', 'vorbis', 'oga',
];

/** The format token from a MIME type or a filename, lowercased. */
export function formatOf(song: { mimeType?: string; filePath?: string }): string | null {
  const mime = song.mimeType?.split(';')[0]?.trim().toLowerCase();
  if (mime) {
    const subtype = mime.split('/')[1];
    if (subtype) return subtype.replace(/^x-/, '');
  }
  const extension = song.filePath?.split('.').pop()?.toLowerCase();
  return extension && extension.length <= 5 ? extension : null;
}

/**
 * The quality to actually request for this track.
 *
 * Only ever downgrades `original`, and only when the format is known and
 * known-undecodable. An unknown format is left alone: today's behaviour is to
 * try the raw file, and transcoding every track whose metadata happens to be
 * missing would be a worse trade than the failure it avoids.
 */
export function playableQuality(
  song: { mimeType?: string; filePath?: string },
  quality: AudioQuality,
  platform: string = Platform.OS,
): AudioQuality {
  if (quality !== 'original') return quality;
  if (platform !== 'ios') return quality;

  const format = formatOf(song);
  if (!format) return quality;

  return IOS_DECODABLE.includes(format) ? quality : 'high';
}
