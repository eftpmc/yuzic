import { useEffect } from 'react';
import { prefetchCovers } from '@/utils/images/imageCache';
import type { CoverSource } from '@/types';

export function usePrefetchCovers(
  covers: readonly (CoverSource | null | undefined)[],
  size: 'thumb' | 'grid' | 'detail' | 'background',
) {
  useEffect(() => {
    prefetchCovers(covers, size);
  }, [covers, size]);
}
