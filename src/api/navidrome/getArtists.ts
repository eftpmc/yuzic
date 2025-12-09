const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const getArtists = async (
    serverUrl: string,
    username: string,
    password: string
) => {
    const response = await fetch(
        `${serverUrl}/rest/getArtists.view?u=${encodeURIComponent(
            username
        )}&p=${encodeURIComponent(password)}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json`
    );

    const data = await response.json();
    return data['subsonic-response']?.artists || null;
};
