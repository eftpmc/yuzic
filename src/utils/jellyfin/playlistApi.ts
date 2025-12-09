import {
    getPlaylists
} from '@/api/jellyfin/getPlaylists';
import {
    getPlaylistItems
} from '@/api/jellyfin/getPlaylistItems';
import {
    createPlaylist
} from '@/api/jellyfin/createPlaylist';
import {
    addPlaylistItems
} from '@/api/jellyfin/updatePlaylist';
import {
    removePlaylistItems
} from '@/api/jellyfin/updatePlaylist';

export const fetchPlaylists = async (
    serverUrl: string,
    userId: string,
    token: string
) => {
    const list = await getPlaylists(serverUrl, userId, token);
    if (!list) return [];

    const detailed = await Promise.all(
        list.map(async (pl: any) => {
            const items = await getPlaylistItems(serverUrl, pl.Id, userId, token) || [];
            const entryIds = items.map((it: any) => it.PlaylistItemId).filter(Boolean);
            return { id: pl.Id, name: pl.Name, entryIds };
        })
    );

    return detailed;
};

export const createPlaylistJellyfin = createPlaylist;
export const addItemsToPlaylistJellyfin = addPlaylistItems;
export const removeItemsFromPlaylistJellyfin = removePlaylistItems;