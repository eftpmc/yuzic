const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const createPlaylist = async (
    serverUrl: string,
    username: string,
    password: string,
    name: string
) => {
    const response = await fetch(
        `${serverUrl}/rest/createPlaylist.view?u=${encodeURIComponent(
            username
        )}&p=${encodeURIComponent(password)}&v=${API_VERSION}&c=${CLIENT_NAME}&f=json&name=${encodeURIComponent(
            name
        )}`,
        { method: 'POST' }
    );

    if (!response.ok) throw new Error(`Failed to create playlist: ${response.statusText}`);
};
