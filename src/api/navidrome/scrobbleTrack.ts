const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const scrobbleTrack = async (
    serverUrl: string,
    username: string,
    password: string,
    songId: string,
    isSubmission: boolean = false
) => {
    const time = Date.now();

    const url =
        `${serverUrl}/rest/scrobble.view` +
        `?u=${encodeURIComponent(username)}` +
        `&p=${encodeURIComponent(password)}` +
        `&v=${API_VERSION}` +
        `&c=${CLIENT_NAME}` +
        `&f=json` +
        `&id=${encodeURIComponent(songId)}` +
        `&time=${time}` +
        `&submission=${isSubmission}`;

    try {
        await fetch(url);
    } catch (error) {
        console.error('[Scrobble API Error]', error);
    }
};
