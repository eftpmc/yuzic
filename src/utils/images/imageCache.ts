import TurboImage from 'react-native-turbo-image';
import { buildCover, buildCoverCacheKey } from '@/utils/builders/buildCover';
import { mmkv } from '@/utils/mmkvStorage';
import type { CoverSource } from '@/types';

const DISK_CACHE_MIGRATION_KEY = 'image_cache_stable_keys_v1';

export function runImageCacheMigration() {
  if (mmkv.getBoolean(DISK_CACHE_MIGRATION_KEY)) return;
  TurboImage.clearDiskCache().catch(() => {});
  mmkv.set(DISK_CACHE_MIGRATION_KEY, true);
}

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
  const sources = covers
    .filter((cover): cover is CoverSource => !!cover)
    .flatMap(cover => {
      const uri = buildCover(cover, size);
      if (!uri || hasImageUrlFailed(uri)) return [];
      const cacheKey = buildCoverCacheKey(cover, size) ?? uri;
      return [{ uri, cacheKey }];
    });

  const seen = new Set<string>();
  const deduped = sources.filter(s => {
    if (seen.has(s.cacheKey)) return false;
    seen.add(s.cacheKey);
    return true;
  });

  if (!deduped.length) return;

  TurboImage.prefetch(deduped, IMAGE_CACHE_POLICY).catch(() => {});
}

export function clearImageMemoryCache() {
  TurboImage.clearMemoryCache().catch(() => {});
}

export { IMAGE_CACHE_POLICY };
