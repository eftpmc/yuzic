import { star } from '@/api/navidrome/star';
import { unstar } from '@/api/navidrome/unstar';
import { getStarredItems } from '@/api/navidrome/getStarredItems';

export const starItem = async (
    serverUrl: string,
    username: string,
    password: string,
    id: string
) => {
    return await star(serverUrl, username, password, id);
};

export const unstarItem = async (
    serverUrl: string,
    username: string,
    password: string,
    id: string
) => {
    return await unstar(serverUrl, username, password, id);
};

export const getStarredItemIds = async (
    serverUrl: string,
    username: string,
    password: string
) => {
    return await getStarredItems(serverUrl, username, password);
};