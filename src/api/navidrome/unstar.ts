const API_VERSION = '1.16.0';
const CLIENT_NAME = 'NavidromeApp';

export const unstar = async (
    serverUrl: string,
    username: string,
    password: string,
    id: string
) => {
    await fetch(
        `${serverUrl}/rest/unstar.view?u=${encodeURIComponent(username)}` +
        `&p=${encodeURIComponent(password)}` +
        `&v=${API_VERSION}` +
        `&c=${CLIENT_NAME}` +
        `&f=json` +
        `&id=${encodeURIComponent(id)}`
    );
};
