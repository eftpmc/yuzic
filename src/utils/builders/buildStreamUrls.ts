const API_VERSION = '1.16.0';
const CLIENT_NAME = 'Yuzic';

export const buildStreamUrl = (
    songId: string,
    serverUrl: string,
    username: string,
    password: string
): string => {
    return `${serverUrl}/rest/stream.view?id=${songId}&u=${encodeURIComponent(username)}&p=${encodeURIComponent(
        password
    )}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json`;
};

export const buildJellyfinStreamUrl = (
    serverUrl: string,
    token: string,
    songId: string
) => {
    return `${serverUrl}/Audio/${songId}/stream.mp3?static=true&X-Emby-Token=${token}`;
};