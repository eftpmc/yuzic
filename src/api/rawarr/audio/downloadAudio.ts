import { RAWARR_URL } from '@/constants/rawarr';

export type RawarrAudioQuality = 'low' | 'medium' | 'high' | 'original';

export function buildRawarrAudioDownloadUrl(
  streamUrl: string,
  quality: RawarrAudioQuality = 'high',
  rawarrUrl = RAWARR_URL,
): string {
  const baseUrl = rawarrUrl.replace(/\/+$/, '');
  const params = new URLSearchParams({
    url: streamUrl,
    quality,
  });

  return `${baseUrl}/api/audio/download?${params}`;
}

export function buildRawarrAudioTranscodeUrl(rawarrUrl = RAWARR_URL): string {
  return `${rawarrUrl.replace(/\/+$/, '')}/api/audio/transcode`;
}
