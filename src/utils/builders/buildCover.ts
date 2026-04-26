import { COVER_PX, CoverSource } from '@/types';
import store from '@/utils/redux/store';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { SERVER_PROVIDERS } from '@/utils/servers/registry';

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

  if (cover.kind === 'musicbrainz') {
    const id = cover.releaseGroupId
    if (!id) return null

    // CAA only guarantees 250 and 500 thumbnails for release-group covers.
    // 1200 is only generated for large originals and 404s otherwise.
    const mbSize = px <= 250 ? 250 : 500

    return `https://coverartarchive.org/release-group/${id}/front-${mbSize}`
  }

  const state = store.getState();
  const active = selectActiveServer(state);

  if (!active) return null;

  const provider = SERVER_PROVIDERS[active.type];
  if (!provider) return null;
  return provider.buildCoverUrl(active, cover, px);
}

