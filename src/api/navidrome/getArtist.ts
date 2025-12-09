const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const getArtist = async (
    serverUrl: string,
    username: string,
    password: string,
    artistId: string
) => {
    const response = await fetch(
        `${serverUrl}/rest/getArtist.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
            password
        )}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json&id=${artistId}`
    );

    const data = await response.json();
    return data['subsonic-response']?.artist || null;
};
