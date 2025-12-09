const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const getAlbum = async (
    serverUrl: string,
    username: string,
    password: string,
    albumId: string
) => {
    const response = await fetch(
        `${serverUrl}/rest/getAlbum.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
            password
        )}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json&id=${albumId}`
    );

    const data = await response.json();
    return data['subsonic-response']?.album || null;
};
