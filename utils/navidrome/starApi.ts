const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

const buildAuthParams = (username: string, password: string): string =>
    `u=${encodeURIComponent(username)}&p=${encodeURIComponent(password)}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json`;

export const starItem = async (serverUrl: string, username: string, password: string, id: string) => {
    const authParams = buildAuthParams(username, password);
    await fetch(`${serverUrl}/rest/star.view?${authParams}&id=${id}`);
};

export const unstarItem = async (serverUrl: string, username: string, password: string, id: string) => {
    const authParams = buildAuthParams(username, password);
    await fetch(`${serverUrl}/rest/unstar.view?${authParams}&id=${id}`);
};

export const getStarredItemIds = async (
    serverUrl: string,
    username: string,
    password: string
): Promise<{ albumIds: string[]; artistIds: string[]; songIds: string[] }> => {
    const authParams = buildAuthParams(username, password);
    const response = await fetch(`${serverUrl}/rest/getStarred.view?${authParams}`);
    const data = await response.json();
    const starred = data['subsonic-response']?.starred || {};

    return {
        albumIds: (starred.album || []).map((album: any) => album.id),
        artistIds: (starred.artist || []).map((artist: any) => artist.id),
        songIds: (starred.song || []).map((song: any) => song.id),
    };
};