
export const scrobbleTrack = async (
    songId: string,
    serverUrl: string,
    username: string,
    password: string,
    isSubmission = false
) => {
    const time = Date.now();
    const url = `${serverUrl}/rest/scrobble.view?u=${encodeURIComponent(username)}&p=${encodeURIComponent(
        password
    )}&v=1.16.0&c=NavidromeApp&f=json&id=${encodeURIComponent(songId)}&time=${time}&submission=${isSubmission}`;

    try {
        await fetch(url);
    } catch (error) {
        console.error('[Scrobble Error]', error);
    }
};
