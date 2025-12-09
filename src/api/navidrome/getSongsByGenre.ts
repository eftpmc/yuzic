const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const getSongsByGenre = async (
    serverUrl: string,
    username: string,
    password: string,
    genre: string,
    count: number = 500
) => {
    const response = await fetch(
        `${serverUrl}/rest/getSongsByGenre.view?u=${encodeURIComponent(
            username
        )}&p=${encodeURIComponent(password)}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json&genre=${encodeURIComponent(
            genre
        )}&count=${count}`
    );

    const data = await response.json();
    return data['subsonic-response']?.songsByGenre?.song || [];
};
