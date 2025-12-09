const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const getPlaylists = async (
    serverUrl: string,
    username: string,
    password: string
) => {
    const response = await fetch(
        `${serverUrl}/rest/getPlaylists.view?u=${encodeURIComponent(
            username
        )}&p=${encodeURIComponent(password)}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json&size=500`
    );

    const data = await response.json();
    return data['subsonic-response']?.playlists?.playlist || [];
};
