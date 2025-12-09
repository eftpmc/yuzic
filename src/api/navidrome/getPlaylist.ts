const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const getPlaylist = async (
    serverUrl: string,
    username: string,
    password: string,
    playlistId: string
) => {
    const response = await fetch(
        `${serverUrl}/rest/getPlaylist.view?u=${encodeURIComponent(
            username
        )}&p=${encodeURIComponent(password)}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json&id=${playlistId}`
    );

    const data = await response.json();
    return data['subsonic-response']?.playlist || null;
};
