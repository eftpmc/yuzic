import type { AudioQuality } from '@/utils/redux/slices/settingsSlice';

export type StreamParams = {
  format: 'mp3' | 'raw';
  maxBitRate?: number;
};

export function qualityToStreamParams(quality: AudioQuality): StreamParams {
  switch (quality) {
    case 'low':      return { format: 'mp3', maxBitRate: 128 };
    case 'medium':   return { format: 'mp3', maxBitRate: 192 };
    case 'high':     return { format: 'mp3', maxBitRate: 320 };
    case 'original': return { format: 'raw' };
  }
}
