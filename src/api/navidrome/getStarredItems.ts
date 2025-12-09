const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const getStarredItems = async (
    serverUrl: string,
    username: string,
    password: string
): Promise<{ albumIds: string[]; artistIds: string[]; songIds: string[] }> => {
    const response = await fetch(
        `${serverUrl}/rest/getStarred.view?u=${encodeURIComponent(username)}` +
        `&p=${encodeURIComponent(password)}` +
        `&v=${API_VERSION}` +
        `&c=${CLIENT_NAME}` +
        `&f=json`
    );

    const data = await response.json();
    const starred = data['subsonic-response']?.starred || {};

    return {
        albumIds: (starred.album || []).map((a: any) => a.id),
        artistIds: (starred.artist || []).map((a: any) => a.id),
        songIds: (starred.song || []).map((s: any) => s.id),
    };
};