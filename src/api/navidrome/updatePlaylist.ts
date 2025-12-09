const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const addSongToPlaylist = async (
    serverUrl: string,
    username: string,
    password: string,
    playlistId: string,
    songId: string
) => {
    const response = await fetch(
        `${serverUrl}/rest/updatePlaylist.view?u=${encodeURIComponent(
            username
        )}&p=${encodeURIComponent(password)}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json` +
        `&playlistId=${playlistId}&songIdToAdd=${songId}`,
        { method: 'POST' }
    );

    if (!response.ok) throw new Error(`Failed to add song: ${response.statusText}`);
};


export const removeSongFromPlaylist = async (
    serverUrl: string,
    username: string,
    password: string,
    playlistId: string,
    songIndex: string
) => {
    const response = await fetch(
        `${serverUrl}/rest/updatePlaylist.view?u=${encodeURIComponent(
            username
        )}&p=${encodeURIComponent(password)}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json` +
        `&playlistId=${playlistId}&songIndexToRemove=${songIndex}`,
        { method: 'POST' }
    );

    if (!response.ok) throw new Error(`Failed to remove song: ${response.statusText}`);
};
