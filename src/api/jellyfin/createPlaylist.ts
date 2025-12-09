export const createPlaylist = async (
    serverUrl: string,
    userId: string,
    token: string,
    name: string
) => {
    const response = await fetch(`${serverUrl}/Playlists`, {
        method: 'POST',
        headers: { 'X-Emby-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Name: name, UserId: userId, MediaType: 'Audio' }),
    });

    if (!response.ok) return null;

    const json = await response.json();
    return json.Id;
};
