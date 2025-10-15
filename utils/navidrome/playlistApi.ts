import { buildCoverArtUrl, buildStreamUrl } from '@/utils/urlBuilders';
import { PlaylistData, SongData } from '@/types';

const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

/**
 * Fetch playlists with just their IDs and song IDs.
 */
export const fetchPlaylists = async (
    serverUrl: string,
    username: string,
    password: string
): Promise<{
    id: string;
    name: string;
    entryIds: string[];
}[]> => {
    const response = await fetch(
        `${serverUrl}/rest/getPlaylists.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
            password
        )}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json&size=500`
    );

    const data = await response.json();
    const playlistList = data['subsonic-response']?.playlists?.playlist || [];

    const details = await Promise.all(
        playlistList.map(async (playlist: any) => {
            const res = await fetch(
                `${serverUrl}/rest/getPlaylist.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
                    password
                )}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json&id=${playlist.id}`
            );
            const resData = await res.json();
            const entries = resData['subsonic-response']?.playlist?.entry || [];

            return {
                id: playlist.id,
                name: playlist.name,
                entryIds: entries.map((s: any) => s.id),
            };
        })
    );

    return details;
};

/**
 * Add a song to a playlist.
 */
export const addSongToPlaylistNav = async (
    serverUrl: string,
    username: string,
    password: string,
    playlistId: string,
    songId: string
): Promise<void> => {
    const response = await fetch(
        `${serverUrl}/rest/updatePlaylist.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
            password
        )}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json&playlistId=${playlistId}&songIdToAdd=${songId}`,
        { method: 'POST' }
    );

    if (!response.ok) {
        throw new Error(`Failed to add song to playlist: ${response.statusText}`);
    }
};

/**
 * Remove a song from a playlist.
 */
export const removeSongFromPlaylistNav = async (
    serverUrl: string,
    username: string,
    password: string,
    playlistId: string,
    songIndex: string
): Promise<void> => {
    const response = await fetch(
        `${serverUrl}/rest/updatePlaylist.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
            password
        )}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json&playlistId=${playlistId}&songIndexToRemove=${songIndex}`,
        { method: 'POST' }
    );

    if (!response.ok) {
        throw new Error(`Failed to remove song from playlist: ${response.statusText}`);
    }
};

/**
 * Create a new playlist.
 */
export const createPlaylistNav = async (
    serverUrl: string,
    username: string,
    password: string,
    name: string
): Promise<void> => {
    const response = await fetch(
        `${serverUrl}/rest/createPlaylist.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
            password
        )}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json&name=${encodeURIComponent(name)}`,
        { method: 'POST' }
    );

    if (!response.ok) {
        throw new Error(`Failed to create playlist: ${response.statusText}`);
    }
};