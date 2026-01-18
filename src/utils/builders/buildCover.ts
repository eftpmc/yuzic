import { COVER_PX, CoverSource } from '@/types';
import store from '@/utils/redux/store';
import { selectActiveServer } from '@/utils/redux/selectors/serversSelectors';
import { getServerProvider } from '@/utils/servers/registry';

export function buildCover(
  cover: CoverSource,
  size: 'thumb' | 'grid' | 'detail' | 'background'
): string | null {
  const px = COVER_PX[size];

  if (!cover || cover.kind === 'none') return null;

  if (cover.kind === 'special' && cover.name === 'heart') {
    return 'heart-icon';
  }

  if (cover.kind === 'lastfm') {
    return cover.url || null;
  }

  const state = store.getState();
  const active = selectActiveServer(state);

  if (!active) return null;

  const provider = getServerProvider(active.type);
  const { serverUrl, username, auth } = active;

  if (!serverUrl || !username || !auth) return null;

  if (cover.kind === 'navidrome' && active.type === 'navidrome') {
    const password = auth.password as string | undefined;
    if (!password) return null;

    return (
      `${serverUrl}/rest/getCoverArt.view` +
      `?id=${encodeURIComponent(cover.coverArtId)}` +
      `&size=${px}` +
      `&u=${encodeURIComponent(username)}` +
      `&p=${encodeURIComponent(password)}` +
      `&v=1.16.0` +
      `&c=Yuzic`
    );
  }

  if (cover.kind === 'jellyfin' && active.type === 'jellyfin') {
    const token = auth.token as string | undefined;
    if (!token) return null;

    const type = cover.imageType ?? 'Primary';

    const params = new URLSearchParams();
    params.set('quality', '90');
    params.set('maxWidth', String(px));
    params.set('maxHeight', String(px));
    params.set('X-Emby-Token', token);

    if (cover.tag) {
      params.set('tag', cover.tag);
    }

    return `${serverUrl}/Items/${cover.itemId}/Images/${type}?${params.toString()}`;
  }

  return null;
}