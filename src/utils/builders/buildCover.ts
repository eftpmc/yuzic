import { COVER_PX, CoverSource } from '@/types';
import store from '@/utils/redux/store';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { SERVER_PROVIDERS } from '@/utils/servers/registry';

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
    return cover.url || null;
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
