import { getStarredItems } from '@/api/jellyfin/getStarredItems';
import { star } from '@/api/jellyfin/star';
import { unstar } from '@/api/jellyfin/unstar';

export const getStarredItemIdsJellyfin = async (
    serverUrl: string,
    userId: string,
    token: string
) => {
    const items = await getStarredItems(serverUrl, userId, token);
    if (!items) return { albumIds: [], artistIds: [], songIds: [] };

    const albumIds: string[] = [];
    const artistIds: string[] = [];
    const songIds: string[] = [];

    for (const item of items) {
        if (item.Type === 'MusicAlbum') albumIds.push(item.Id);
        else if (item.Type === 'MusicArtist') artistIds.push(item.Id);
        else if (item.Type === 'Audio') songIds.push(item.Id);
    }

    return { albumIds, artistIds, songIds };
};

export const favoriteItemJellyfin = star;
export const unfavoriteItemJellyfin = unstar;