import { getPlaylists } from '@/api/navidrome/getPlaylists';
import { getPlaylist } from '@/api/navidrome/getPlaylist';
import {
    addSongToPlaylist,
    removeSongFromPlaylist,
} from '@/api/navidrome/updatePlaylist';
import { createPlaylist } from '@/api/navidrome/createPlaylist';

export const fetchPlaylists = async (
    serverUrl: string,
    username: string,
    password: string
): Promise<{ id: string; name: string; entryIds: string[] }[]> => {
    const playlistList = await getPlaylists(serverUrl, username, password);

    const details = await Promise.all(
        playlistList.map(async (playlist: any) => {
            const data = await getPlaylist(serverUrl, username, password, playlist.id);
            const entries = data?.entry || [];

            return {
                id: playlist.id,
                name: playlist.name,
                entryIds: entries.map((s: any) => s.id),
            };
        })
    );

    return details;
};

export const addSongToPlaylistNav = async (
    serverUrl: string,
    username: string,
    password: string,
    playlistId: string,
    songId: string
) => {
    return await addSongToPlaylist(
        serverUrl,
        username,
        password,
        playlistId,
        songId
    );
};

export const removeSongFromPlaylistNav = async (
    serverUrl: string,
    username: string,
    password: string,
    playlistId: string,
    songIndex: string
) => {
    return await removeSongFromPlaylist(
        serverUrl,
        username,
        password,
        playlistId,
        songIndex
    );
};

export const createPlaylistNav = async (
    serverUrl: string,
    username: string,
    password: string,
    name: string
) => {
    return await createPlaylist(serverUrl, username, password, name);
};