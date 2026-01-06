const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const buildCoverArtUrl = (
    coverArtId: string,
    serverUrl: string,
    username: string,
    password: string,
    size: number = 400
): string => {
    return `${serverUrl}/rest/getCoverArt.view?id=${coverArtId}&size=${size}&u=${encodeURIComponent(
        username
    )}&p=${encodeURIComponent(password)}&v=${API_VERSION}&c=${CLIENT_NAME}`;
};
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
    return `${serverUrl}/Audio/${songId}/stream.mp3?X-Emby-Token=${token}`;
};

export const buildJellyfinCoverArtUrl = (
    serverUrl: string,
    token: string,
    id: string
) => {
    return `${serverUrl}/Items/${id}/Images/Primary?quality=90&X-Emby-Token=${token}`;
    //return `${serverUrl}/Items/${songId}/Images/Primary?quality=90&X-Emby-Token=${token}&tag=${p}`;
};