import TurboImage from 'react-native-turbo-image';
import { buildCover } from '@/utils/builders/buildCover';
import type { CoverSource } from '@/types';

const IMAGE_CACHE_POLICY = 'dataCache' as const;
const MAX_FAILED_URLS = 300;

const failedImageUrls = new Set<string>();

function rememberFailedUrl(uri: string) {
  if (!uri) return;
  if (failedImageUrls.size >= MAX_FAILED_URLS) {
    const [oldest] = failedImageUrls;
    if (oldest) failedImageUrls.delete(oldest);
  }
  failedImageUrls.add(uri);
}

export function markImageUrlFailed(uri: string) {
  rememberFailedUrl(uri);
}

export function markImageUrlSucceeded(uri: string) {
  failedImageUrls.delete(uri);
}

export function hasImageUrlFailed(uri: string | null | undefined): boolean {
  return !!uri && failedImageUrls.has(uri);
}

export function resetFailedImageUrl(uri: string) {
  failedImageUrls.delete(uri);
}

export function prefetchImageUrls(urls: readonly (string | null | undefined)[]) {
  const sources = [...new Set(urls.filter((url): url is string => !!url && !hasImageUrlFailed(url)))]
    .map(uri => ({ uri, cacheKey: uri }));

  if (!sources.length) return;

  TurboImage.prefetch(sources, IMAGE_CACHE_POLICY).catch(() => {});
}

export function prefetchCovers(
  covers: readonly (CoverSource | null | undefined)[],
  size: 'thumb' | 'grid' | 'detail' | 'background',
) {
  prefetchImageUrls(covers.map(cover => (cover ? buildCover(cover, size) : null)));
}

export function clearImageMemoryCache() {
  TurboImage.clearMemoryCache().catch(() => {});
}

export { IMAGE_CACHE_POLICY };
