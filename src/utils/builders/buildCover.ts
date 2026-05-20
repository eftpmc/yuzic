import { COVER_PX, CoverSource } from '@/types';
import store from '@/utils/redux/store';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { SERVER_PROVIDERS } from '@/utils/servers/registry';
import { normalizeImageUrlForSize } from '@/utils/images/normalizeImageUrl';

export function buildCoverArtArchiveUrl(
  mbid: string,
  mbidType: 'release' | 'release-group' | 'unknown',
  size: 'thumb' | 'grid' | 'detail' | 'background'
): string | null {
  if (!mbid) return null

  // CAA only guarantees 250 and 500 thumbnails for release-group covers.
  // 1200 is only generated for large originals and 404s otherwise.
  const mbSize = COVER_PX[size] <= 250 ? 250 : 500
  const endpoint = mbidType === 'release' ? 'release' : 'release-group'

  return `https://coverartarchive.org/${endpoint}/${mbid}/front-${mbSize}`
}

export function buildCoverCacheKey(
  cover: CoverSource,
  size: 'thumb' | 'grid' | 'detail' | 'background'
): string | null {
  const px = COVER_PX[size];

  if (!cover || cover.kind === 'none' || cover.kind === 'special') return null;

  if (cover.kind === 'url') return `url:${cover.url}:${px}`;
  if (cover.kind === 'commons') return `commons:${cover.filename}:${px}`;
  if (cover.kind === 'musicbrainz') return `musicbrainz:${cover.releaseGroupId}:${px}`;
  if (cover.kind === 'coverartarchive') return `coverartarchive:${cover.mbid}:${cover.mbidType}:${px}`;

  const state = store.getState();
  const active = selectActiveServer(state);
  if (!active) return null;

  if (cover.kind === 'navidrome') return `navidrome:${active.id}:${cover.coverArtId}:${px}`;
  if (cover.kind === 'jellyfin') return `jellyfin:${active.id}:${cover.itemId}:${px}`;
  if (cover.kind === 'emby') return `emby:${active.id}:${cover.itemId}:${cover.tag ?? ''}:${px}`;

  return null;
}

export function buildCover(
  cover: CoverSource,
  size: 'thumb' | 'grid' | 'detail' | 'background'
): string | null {
  const px = COVER_PX[size];

  if (!cover || cover.kind === 'none') return null;

  if (cover.kind === 'special' && cover.name === 'heart') {
    return 'heart-icon';
  }

  if (cover.kind === 'url') {
    return cover.url ? normalizeImageUrlForSize(cover.url, px) : null;
  }

  if (cover.kind === 'commons') {
    const w = Math.min(px, 1800)
    return `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(cover.filename)}&w=${w}`
  }

  if (cover.kind === 'musicbrainz' || cover.kind === 'coverartarchive') {
    const id = cover.kind === 'musicbrainz' ? cover.releaseGroupId : cover.mbid
    const mbidType = cover.kind === 'coverartarchive' ? cover.mbidType : 'release-group'
    return buildCoverArtArchiveUrl(id, mbidType, size)
  }

  const state = store.getState();
  const active = selectActiveServer(state);

  if (!active) return null;

  const provider = SERVER_PROVIDERS[active.type];
  if (!provider) return null;
  return provider.buildCoverUrl(active, cover, px);
}
