import { COVER_PX } from '@/types';
import { CoverSource } from '@/types'; 
import { useSelector } from 'react-redux';
import { selectActiveServer } from '../redux/selectors/serversSelectors';

export function buildCover(cover: CoverSource, size: 'thumb' | 'grid' | 'detail' | 'background') {
  const px = COVER_PX[size];

  if (!cover || cover.kind === 'none') return null;
  if (cover.kind === 'special' && cover.name === 'heart') return 'heart-icon';

  const active = useSelector(selectActiveServer);

  if (cover.kind === 'navidrome' && active && active.type === 'navidrome') {
    const { serverUrl, username, password } = active;
    return `${serverUrl}/rest/getCoverArt.view?id=${cover.coverArtId}&size=${px}&u=${encodeURIComponent(
      username
    )}&p=${encodeURIComponent(password)}&v=1.16.0&c=Yuzic`;
  }

  if (cover.kind === 'jellyfin' && active && active.type === 'jellyfin') {
    const { serverUrl, token } = active;
    const type = cover.imageType ?? 'Primary';

    const params = new URLSearchParams();
    params.set('quality', '90');
    params.set('maxWidth', String(px));
    params.set('maxHeight', String(px));
    params.set('X-Emby-Token', token);

    if (cover.tag) params.set('tag', cover.tag);

    return `${serverUrl}/Items/${cover.itemId}/Images/${type}?${params.toString()}`;
  }

  return null;
}